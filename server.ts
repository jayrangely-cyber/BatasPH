import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  LEGISLATIVE_MEASURES,
  COMMITTEE_HEARINGS,
  DAILY_CONGRESSIONAL_NEWS,
  CongressionalNewsItem,
} from './src/data/legislativeData.ts';
import {
  INITIAL_PHILIPPINE_LEGISLATORS,
  PhilippineLegislatorProfile,
} from './src/data/philippineLegislators.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for Wikimedia Commons official legislator portraits
const portraitCache = new Map<string, string>();

async function resolveWikipediaPortrait(queryOrWikiTitle: string): Promise<string | undefined> {
  const cleanKey = queryOrWikiTitle.trim();
  if (!cleanKey) return undefined;
  if (portraitCache.has(cleanKey)) {
    return portraitCache.get(cleanKey);
  }

  const headers = {
    'User-Agent': 'BatasPH-Legislative-Workbench/1.0 (https://batasph.gov.ph)',
    Accept: 'application/json',
  };

  try {
    // 1. Try direct Wikipedia REST page summary
    const directTitle = encodeURIComponent(cleanKey.replace(/\s+/g, '_'));
    const summaryRes = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${directTitle}`,
      { headers }
    );
    if (summaryRes.ok) {
      const summaryData = (await summaryRes.json()) as {
        thumbnail?: { source?: string };
        originalimage?: { source?: string };
      };
      const imgUrl = summaryData.thumbnail?.source || summaryData.originalimage?.source;
      if (imgUrl) {
        portraitCache.set(cleanKey, imgUrl);
        return imgUrl;
      }
    }

    // 2. Fallback: Search Wikipedia via MediaWiki Action API with pageimages
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      `${cleanKey} Philippines politician senator representative`
    )}&gsrlimit=3&prop=pageimages&piprop=thumbnail&pithumbsize=400&format=json`;
    const searchRes = await fetch(searchUrl, { headers });
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        query?: {
          pages?: Record<
            string,
            { index?: number; thumbnail?: { source?: string }; title?: string }
          >;
        };
      };
      const pages = Object.values(searchData.query?.pages || {}).sort(
        (a, b) => (a.index ?? 99) - (b.index ?? 99)
      );
      for (const page of pages) {
        if (page.thumbnail?.source) {
          portraitCache.set(cleanKey, page.thumbnail.source);
          return page.thumbnail.source;
        }
      }
    }
  } catch (err) {
    console.warn(`Portrait lookup warning for ${cleanKey}:`, err);
  }

  return undefined;
}

// Helper for Gemini calls with exponential backoff and model fallback
async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: unknown;
    systemInstruction?: string;
    useGoogleSearch?: boolean;
    responseMimeType?: string;
    responseSchema?: unknown;
  }
) {
  const candidateModels = ['gemini-4-hydrogen', 'gemini-3.1-flash-lite'];
  let lastError: unknown;

  for (const modelName of candidateModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: Record<string, unknown> = {};
        if (params.systemInstruction) {
          config.systemInstruction = params.systemInstruction;
        }
        if (params.useGoogleSearch) {
          config.tools = [{ googleSearch: {} }];
        }
        if (params.responseMimeType && !params.useGoogleSearch) {
          config.responseMimeType = params.responseMimeType;
        }
        if (params.responseSchema && !params.useGoogleSearch) {
          config.responseSchema = params.responseSchema;
        }

        const response = await ai.models.generateContent({
          model: modelName,
          contents: params.contents as string,
          config,
        });

        if (response.text) {
          return response;
        }
      } catch (err: unknown) {
        lastError = err;
        const rawMsg = err instanceof Error ? err.message : String(err);
        const isTransient =
          rawMsg.includes('503') ||
          rawMsg.includes('UNAVAILABLE') ||
          rawMsg.includes('429') ||
          rawMsg.includes('RESOURCE_EXHAUSTED') ||
          rawMsg.includes('high demand') ||
          rawMsg.includes('overloaded');

        if (!isTransient) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error('The Gemini service is temporarily unavailable.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '2mb' }));

  // Build rich statutory context from BatasPH legislative database
  const statutoryContextSummary = LEGISLATIVE_MEASURES.map(
    (m) =>
      `- ${m.designation} (${m.shortTitle}): Stage: ${m.stage} | Chamber: ${m.chamber} | Primary Committee: ${
        m.primaryCommittee
      } | Sponsor: ${m.primaryAuthor.name} | Tally: ${m.voteTally.yeas} Yeas, ${m.voteTally.nays} Nays, ${
        m.voteTally.abstain
      } Abstain (${m.voteTally.resolutionStatus}) | Fiscal Impact: ${
        m.statutoryBrief.fiscalImpactEstimate
      } | Abstract: ${m.abstract}`
  ).join('\n');

  const committeeContextSummary = COMMITTEE_HEARINGS.map(
    (h) =>
      `- ${h.committeeName} (${h.scheduleDate} ${h.scheduleTime}, ${h.roomLocation}): Chair: ${
        h.chairperson
      } | Quorum: ${h.quorumStatus} | Agenda: ${h.agendaMeasures.join(', ')}`
  ).join('\n');

  const SYSTEM_INSTRUCTION = `You are the BatasPH Executive Legislative & Statutory Intelligence Counsel, an authoritative, non-partisan Philippine parliamentary legal assistant.
You assist researchers, legal counsels, legislators, and citizens in understanding Philippine Republic Acts (Batas), Senate Bills (S.B.), House Bills (H.B.), Senate/House Resolutions (P.S. Res.), bicameral conference amendments, Philippine Senators and Congressmen legislative records, and the 1987 Philippine Constitution.

Current BatasPH Statutory Docket Context:
${statutoryContextSummary}

Upcoming Bicameral & Standing Committee Hearings:
${committeeContextSummary}

Guidelines:
1. Maintain executive, dignified, and rigorous legal clarity. Cite real Philippine Republic Acts (R.A.), Senate Bills, House Bills, and constitutional articles whenever relevant.
2. Structure answers clearly with concise headings or bullet points.`;

  // Endpoint 1: Batch or Single Portrait Resolver for Philippine Senators & Congressmen
  app.get('/api/legislators/portraits', async (_req, res) => {
    try {
      const results: Record<string, string> = {};
      for (const leg of INITIAL_PHILIPPINE_LEGISLATORS) {
        if (leg.photoUrl) {
          results[leg.id] = leg.photoUrl;
        }
      }

      const missingLegs = INITIAL_PHILIPPINE_LEGISLATORS.filter((l) => !results[l.id]);
      if (missingLegs.length > 0) {
        await Promise.all(
          missingLegs.map(async (leg) => {
            const url =
              (await resolveWikipediaPortrait(leg.wikiTitle)) ||
              (await resolveWikipediaPortrait(leg.fullName));
            if (url) {
              results[leg.id] = url;
            }
          })
        );
      }
      return res.json({ portraits: results });
    } catch (error) {
      console.error('Portrait batch error:', error);
      return res.json({ portraits: {} });
    }
  });

  // Endpoint 2: Search & Verify Any Philippine Senator or Congressman (Live Grounded + Official Photo)
  app.post('/api/legislators/search', async (req, res) => {
    try {
      const { query } = req.body as { query?: string };
      if (!query || typeof query !== 'string' || !query.trim()) {
        return res
          .status(400)
          .json({ error: 'Please enter the name of a Philippine Senator or Congressman.' });
      }

      const cleanQuery = query.trim();
      const qLower = cleanQuery.toLowerCase();

      // Match against the complete 342-member 20th Congress roster for official photo & baseline data
      const rosterMatch = INITIAL_PHILIPPINE_LEGISLATORS.find(
        (leg) =>
          leg.fullName.toLowerCase() === qLower ||
          leg.honorificName.toLowerCase() === qLower ||
          leg.fullName.toLowerCase().includes(qLower) ||
          leg.honorificName.toLowerCase().includes(qLower) ||
          (leg.provinceOrCity && leg.provinceOrCity.toLowerCase().includes(qLower)) ||
          leg.districtOrConstituency.toLowerCase().includes(qLower)
      );

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        if (rosterMatch) {
          return res.json({ legislator: rosterMatch });
        }
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured. Check the Settings > Secrets panel.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const measureItemSchema = {
        type: Type.OBJECT,
        properties: {
          designation: { type: Type.STRING },
          title: { type: Type.STRING },
          status: { type: Type.STRING },
          yearOrDate: { type: Type.STRING },
          summary: { type: Type.STRING },
        },
        required: ['designation', 'title', 'status', 'yearOrDate', 'summary'],
      };

      const legislatorResponseSchema = {
        type: Type.OBJECT,
        properties: {
          fullName: { type: Type.STRING },
          honorificName: { type: Type.STRING },
          chamber: { type: Type.STRING },
          roleTitle: { type: Type.STRING },
          districtOrConstituency: { type: Type.STRING },
          partyAffiliation: { type: Type.STRING },
          termInfo: { type: Type.STRING },
          wikiTitle: { type: Type.STRING },
          committeesChaired: { type: Type.ARRAY, items: { type: Type.STRING } },
          notableAccomplishments: { type: Type.ARRAY, items: { type: Type.STRING } },
          biography: { type: Type.STRING },
          billsPassed: { type: Type.ARRAY, items: measureItemSchema },
          authoredMeasures: { type: Type.ARRAY, items: measureItemSchema },
          coAuthoredMeasures: { type: Type.ARRAY, items: measureItemSchema },
          sponsoredLawsAndBills: { type: Type.ARRAY, items: measureItemSchema },
        },
        required: [
          'fullName',
          'honorificName',
          'chamber',
          'roleTitle',
          'districtOrConstituency',
          'partyAffiliation',
          'termInfo',
          'wikiTitle',
          'committeesChaired',
          'notableAccomplishments',
          'biography',
          'billsPassed',
          'authoredMeasures',
          'coAuthoredMeasures',
          'sponsoredLawsAndBills',
        ],
      };

      const prompt = `Provide an accurate, verified legislative profile and accomplishments record for the Philippine legislator (Senator or House Representative / Congressman / Congresswoman) matching: "${cleanQuery}".
Return ONLY a valid JSON object (no markdown fences, no commentary) with the following exact structure:
{
  "fullName": "Full common name of the Philippine Senator or Representative",
  "honorificName": "Full official title and name (e.g. Sen. Sherwin T. Gatchalian or Rep. Ferdinand Alexander A. Marcos)",
  "chamber": "Senate" or "House of Representatives",
  "roleTitle": "Current or most notable leadership/committee role in the 20th Philippine Congress",
  "districtOrConstituency": "National At-Large (for Senators) or specific Legislative District / Party-List (for House Representatives)",
  "partyAffiliation": "Official Philippine political party or coalition",
  "termInfo": "20th Congress of the Philippines (2025–2028)",
  "wikiTitle": "Exact English Wikipedia article title with underscores",
  "committeesChaired": ["List of key Senate or House committees chaired or member of"],
  "notableAccomplishments": [
    "Key public office held, executive/local government service, or landmark legislative milestone",
    "Second notable accomplishment or legislative reform champion record",
    "Third notable accomplishment or constituent program"
  ],
  "biography": "2-3 sentence authoritative parliamentary biography summarizing their legislative accomplishments in the Philippines.",
  "billsPassed": [
    {
      "designation": "Real Enacted Republic Act R.A. No. (e.g. R.A. No. 10931)",
      "title": "Official short title of the Philippine law passed",
      "status": "PASSED INTO LAW (ENACTED REPUBLIC ACT)",
      "yearOrDate": "Year enacted",
      "summary": "1-2 sentence accurate summary of the law passed."
    }
  ],
  "authoredMeasures": [
    {
      "designation": "Real R.A. No. or S.B./H.B. No.",
      "title": "Official short title of the Philippine law or bill",
      "status": "PRINCIPAL AUTHOR · ENACTED LAW or 20TH CONGRESS PRIORITY",
      "yearOrDate": "Year enacted or 20th Congress",
      "summary": "1-2 sentence accurate summary of the law or bill's provisions."
    }
  ],
  "coAuthoredMeasures": [
    {
      "designation": "Real R.A. No. or S.B./H.B. No.",
      "title": "Official short title",
      "status": "CO-AUTHOR · ENACTED LAW or IN COMMITTEE",
      "yearOrDate": "Year",
      "summary": "1-2 sentence accurate summary."
    }
  ],
  "sponsoredLawsAndBills": [
    {
      "designation": "Real R.A. No. or S.B./H.B. No.",
      "title": "Official short title",
      "status": "PRINCIPAL SPONSOR · ENACTED LAW",
      "yearOrDate": "Year",
      "summary": "1-2 sentence accurate summary."
    }
  ]
}
IMPORTANT: Ensure every Republic Act (R.A.) number, Senate Bill (S.B.), and House Bill (H.B.) listed is accurate for this Philippine legislator. Include at least 2-3 items in each of billsPassed, authoredMeasures, coAuthoredMeasures, and sponsoredLawsAndBills.`;

      let parsed: Partial<PhilippineLegislatorProfile> | null = null;
      const verifiedSources: { title: string; uri: string }[] = [];

      const extractJsonObject = (text: string): Partial<PhilippineLegislatorProfile> => {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
          throw new Error('No JSON object found in model output');
        }
        return JSON.parse(cleaned.slice(start, end + 1)) as Partial<PhilippineLegislatorProfile>;
      };

      try {
        const groundedRes = await generateWithFallback(ai, {
          contents: prompt,
          useGoogleSearch: true,
        });
        parsed = extractJsonObject(groundedRes.text || '');
        const chunks = groundedRes.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          for (const chunk of chunks) {
            const web = (chunk as { web?: { uri?: string; title?: string } }).web;
            if (web?.uri && web?.title) {
              verifiedSources.push({ title: web.title, uri: web.uri });
            }
          }
        }
      } catch {
        try {
          const structuredRes = await generateWithFallback(ai, {
            contents: prompt,
            useGoogleSearch: false,
            responseMimeType: 'application/json',
            responseSchema: legislatorResponseSchema,
          });
          parsed = extractJsonObject(structuredRes.text || '');
        } catch (innerErr) {
          console.warn('Structured legislator lookup fallback triggered:', innerErr);
          if (rosterMatch) {
            return res.json({
              legislator: {
                ...rosterMatch,
                lastSyncedAt: new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                }),
              },
            });
          }
        }
      }

      if (!parsed && rosterMatch) {
        return res.json({ legislator: rosterMatch });
      }

      const safeParsed = parsed || {};
      const resolvedFullName = safeParsed.fullName || rosterMatch?.fullName || cleanQuery;
      const photoUrl =
        rosterMatch?.photoUrl ||
        (await resolveWikipediaPortrait(safeParsed.wikiTitle || resolvedFullName)) ||
        (await resolveWikipediaPortrait(resolvedFullName)) ||
        (await resolveWikipediaPortrait(cleanQuery));

      const id =
        rosterMatch?.id ||
        `leg-${resolvedFullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      const legislatorProfile: PhilippineLegislatorProfile = {
        id,
        rosterNumber: rosterMatch?.rosterNumber,
        subCategory:
          rosterMatch?.subCategory ||
          (safeParsed.chamber === 'House of Representatives'
            ? 'District Representative'
            : 'Senator'),
        fullName: resolvedFullName,
        honorificName:
          safeParsed.honorificName || rosterMatch?.honorificName || resolvedFullName,
        chamber:
          safeParsed.chamber === 'House of Representatives' ||
          rosterMatch?.chamber === 'House of Representatives'
            ? 'House of Representatives'
            : 'Senate',
        roleTitle:
          safeParsed.roleTitle ||
          rosterMatch?.roleTitle ||
          'Member of the 20th Philippine Congress',
        districtOrConstituency:
          safeParsed.districtOrConstituency ||
          rosterMatch?.districtOrConstituency ||
          'Republic of the Philippines',
        provinceOrCity: rosterMatch?.provinceOrCity,
        districtLabel: rosterMatch?.districtLabel,
        partyAffiliation:
          safeParsed.partyAffiliation ||
          rosterMatch?.partyAffiliation ||
          '20th Congress Coalition',
        bloc: rosterMatch?.bloc,
        termInfo:
          safeParsed.termInfo ||
          rosterMatch?.termInfo ||
          '20th Congress of the Philippines (2025–2028)',
        roleNotes: rosterMatch?.roleNotes,
        wikiTitle:
          safeParsed.wikiTitle ||
          rosterMatch?.wikiTitle ||
          resolvedFullName.replace(/\s+/g, '_'),
        photoUrl,
        committeesChaired:
          Array.isArray(safeParsed.committeesChaired) &&
          safeParsed.committeesChaired.length > 0
            ? safeParsed.committeesChaired
            : rosterMatch?.committeesChaired || [],
        notableAccomplishments:
          Array.isArray(safeParsed.notableAccomplishments) &&
          safeParsed.notableAccomplishments.length > 0
            ? safeParsed.notableAccomplishments
            : rosterMatch?.notableAccomplishments || [],
        biography:
          safeParsed.biography ||
          rosterMatch?.biography ||
          `${resolvedFullName} serves in the 20th Congress of the Philippines.`,
        billsPassed:
          Array.isArray(safeParsed.billsPassed) && safeParsed.billsPassed.length > 0
            ? safeParsed.billsPassed
            : rosterMatch?.billsPassed || [],
        authoredMeasures:
          Array.isArray(safeParsed.authoredMeasures) &&
          safeParsed.authoredMeasures.length > 0
            ? safeParsed.authoredMeasures
            : rosterMatch?.authoredMeasures || [],
        coAuthoredMeasures:
          Array.isArray(safeParsed.coAuthoredMeasures) &&
          safeParsed.coAuthoredMeasures.length > 0
            ? safeParsed.coAuthoredMeasures
            : rosterMatch?.coAuthoredMeasures || [],
        sponsoredLawsAndBills:
          Array.isArray(safeParsed.sponsoredLawsAndBills) &&
          safeParsed.sponsoredLawsAndBills.length > 0
            ? safeParsed.sponsoredLawsAndBills
            : rosterMatch?.sponsoredLawsAndBills || [],
        verifiedSources: verifiedSources.slice(0, 4),
        lastSyncedAt: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      };

      return res.json({ legislator: legislatorProfile });
    } catch (error: unknown) {
      console.error('Legislator search error:', error);
      return res.status(500).json({
        error: 'Unable to retrieve legislator profile at this moment. Please try again.',
      });
    }
  });

  // Endpoint 3: Daily Live Senate & Congress News Sync (Updated Every Day via Google Search Grounding)
  app.post('/api/daily-congress-sync', async (_req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured on the server.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const todayFormatted = new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      const prompt = `Search for the latest real legislative developments, plenary approvals, committee hearings, and Republic Acts from the Senate of the Philippines (senate.gov.ph) and the Philippine House of Representatives (congress.gov.ph) as of ${todayFormatted}.
Return ONLY a valid JSON array of 4 news objects (no markdown fences, no extra text) following this exact structure:
[
  {
    "id": "live-news-1",
    "chamber": "Senate" or "House of Representatives" or "Joint Bicameral",
    "bulletinType": "PLENARY PASSAGE" or "BICAMERAL ACCORD" or "BLUE RIBBON SUBPOENA" or "GAZETTE IRR" or "APPROPRIATIONS",
    "headline": "Concise, authoritative legislative headline regarding a real Philippine bill, committee inquiry, or Republic Act",
    "summary": "2-sentence executive summary of the legislative action.",
    "fullDispatch": "Detailed 4-5 sentence parliamentary press dispatch citing the senators or house representatives involved, the bill/law designation, and constitutional or fiscal context.",
    "keyTakeaways": [
      "Takeaway 1 with specific statutory or committee detail",
      "Takeaway 2 with specific vote or implementation detail",
      "Takeaway 3 with next procedural step"
    ],
    "publishedDate": "${todayFormatted}",
    "publishedTime": "LIVE SYNC",
    "journalCitation": "Official Senate / House Press & Journal Bulletin",
    "relatedMeasureId": "hb-4728",
    "relatedDesignation": "Official Bill or R.A. Designation (e.g. R.A. No. 12066 or S.B. No. 2890)"
  }
]`;

      let response;
      try {
        response = await generateWithFallback(ai, {
          contents: prompt,
          useGoogleSearch: true,
        });
      } catch {
        response = await generateWithFallback(ai, {
          contents: prompt,
          useGoogleSearch: false,
        });
      }

      const rawText = (response.text || '').trim();
      const arrStart = rawText.indexOf('[');
      const arrEnd = rawText.lastIndexOf(']');
      if (arrStart === -1 || arrEnd === -1) {
        return res.json({
          news: DAILY_CONGRESSIONAL_NEWS,
          syncedDate: todayFormatted,
        });
      }

      const parsedNews = JSON.parse(
        rawText.slice(arrStart, arrEnd + 1)
      ) as CongressionalNewsItem[];

      return res.json({
        news:
          Array.isArray(parsedNews) && parsedNews.length > 0
            ? parsedNews
            : DAILY_CONGRESSIONAL_NEWS,
        syncedDate: todayFormatted,
      });
    } catch (error) {
      console.error('Daily Congress Sync Error:', error);
      return res.json({
        news: DAILY_CONGRESSIONAL_NEWS,
        syncedDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
      });
    }
  });

  // Endpoint 4: AI Legislative Chat
  app.post('/api/legislative-chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error:
            'GEMINI_API_KEY is not configured on the server. Please check the Settings > Secrets panel in AI Studio.',
        });
      }

      const { message, history = [], selectedMeasureId } = req.body as {
        message?: string;
        history?: { role: 'user' | 'model'; text: string }[];
        selectedMeasureId?: string;
      };

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A valid legislative inquiry message is required.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const activeMeasure = LEGISLATIVE_MEASURES.find((m) => m.id === selectedMeasureId);
      const activeMeasureFocus = activeMeasure
        ? `\n\n[User is currently inspecting ${activeMeasure.designation} — "${activeMeasure.shortTitle}" (${activeMeasure.stage}). Prioritize details from this measure if the question is contextual.]`
        : '';

      const formattedContents = [
        ...history.map((turn) => ({
          role: turn.role,
          parts: [{ text: turn.text }],
        })),
        {
          role: 'user',
          parts: [{ text: message }],
        },
      ];

      const response = await generateWithFallback(ai, {
        contents: formattedContents,
        systemInstruction: SYSTEM_INSTRUCTION + activeMeasureFocus,
      });

      return res.json({
        reply: response.text ?? 'No statutory analysis returned.',
        timestamp: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }),
      });
    } catch (error: unknown) {
      console.error('BatasPH Legislative AI Error:', error);
      let errMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred while querying the Gemini API.';

      try {
        const jsonStart = errMessage.indexOf('{');
        if (jsonStart !== -1) {
          const parsed = JSON.parse(errMessage.slice(jsonStart));
          if (parsed?.error?.message) {
            errMessage = parsed.error.message;
          }
        }
      } catch {
        // Keep original message if not valid JSON
      }

      return res.status(500).json({
        error: errMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BatasPH Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
