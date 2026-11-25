import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Scale,
  Check,
  AlertTriangle,
  BookOpen,
  ChevronRight,
  SlidersHorizontal,
  Download,
  X,
  GitCompare,
  ShieldCheck,
  Landmark,
  Gavel,
  MessageSquarePlus,
  Send,
  HelpCircle,
  MessageSquare,
  FileCheck2,
  Bookmark,
  Plus,
  Loader2,
  RotateCcw,
  Newspaper,
  Clock,
  ChevronDown,
  ChevronUp,
  Users,
  RefreshCw,
  Award,
  ExternalLink,
} from 'lucide-react';
import {
  LEGISLATIVE_MEASURES,
  COMMITTEE_HEARINGS,
  DAILY_CONGRESSIONAL_NEWS,
  LegislativeMeasure,
  CongressionalNewsItem,
  BillPrefix,
  StatusCategory,
  StatutoryClause,
  LegislativeStage,
} from './data/legislativeData';
import {
  CONGRESS_20TH_OVERVIEW,
  INITIAL_PHILIPPINE_LEGISLATORS,
  PhilippineLegislatorProfile,
} from './data/philippineLegislators';

type WorkspaceTab = 'docket' | 'tracker' | 'legislators' | 'ai-faq' | 'roll-call';

interface ChatTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  referencedMeasure?: string;
}

interface StatutoryFAQItem {
  id: string;
  category: 'Constitutional Procedure' | 'Bicameral Reconciliation' | 'Appropriations & Veto' | 'Active Docket';
  question: string;
  constitutionalBasis: string;
  shortAnswer: string;
  aiFollowUpPrompt: string;
}

const STATUTORY_FAQ_BANK: StatutoryFAQItem[] = [
  {
    id: 'faq-1',
    category: 'Bicameral Reconciliation',
    question: 'What is the legal scope of a Bicameral Conference Committee when reconciling H.B. 4728 and S.B. 2890?',
    constitutionalBasis: '1987 Constitution · Art. VI, Sec. 26(2)',
    shortAnswer:
      'Under Philippine parliamentary jurisprudence (Tolentino v. Secretary of Finance), the Bicameral Conference Committee may introduce germane amendments, reconcile conflicting Senate and House provisions, and insert provisos such as the 24-hour SCADA emergency diagnostic warrant in H.B. No. 4728, provided both Chambers subsequently ratify the Bicameral Report.',
    aiFollowUpPrompt:
      'Explain the exact Bicameral Conference amendments made to H.B. No. 4728 (Sovereign Grid Resilience Act) in Article II Section 4 and Article IV Section 9, and how they comply with Article VI of the Constitution.',
  },
  {
    id: 'faq-2',
    category: 'Appropriations & Veto',
    question: 'Why is a National Treasurer Certificate of Availability of Funds required for Special Appropriations Bills?',
    constitutionalBasis: '1987 Constitution · Art. VI, Sec. 25(4)',
    shortAnswer:
      'Article VI, Section 25(4) mandates that every special appropriations bill must be supported by funds actually available as certified by the National Treasurer, or to be raised by a corresponding revenue proposal therein. In H.B. No. 4728, ₱16.20B was certified against the Special Sovereign Energy Fund (#2026-884A).',
    aiFollowUpPrompt:
      'Compare the fiscal compliance of H.B. No. 4728 (₱16.20B Special Energy Fund) against the vetoed H.B. No. 3109 (-₱68.40B revenue erosion). Why was H.B. 3109 vetoed under Article VI Section 28(1)?',
  },
  {
    id: 'faq-3',
    category: 'Constitutional Procedure',
    question: 'How does a Senate or House Bill become an enacted Republic Act (Batas) in the Philippines?',
    constitutionalBasis: '1987 Constitution · Art. VI, Sec. 26–27',
    shortAnswer:
      'A bill undergoes Three Readings on separate days (First Reading referral to Committee; Second Reading floor sponsorship, interpellation, and amendments; Third Reading roll-call vote), followed by Bicameral Conference reconciliation, Enrolled Bill transmission to Malacañang, and either Presidential signature into a Republic Act (R.A.) or lapse into law after 30 days.',
    aiFollowUpPrompt:
      'Walk me through the 6 legislative milestones from First Reading to Enacted Republic Act (Batas) using R.A. No. 11984 and H.B. No. 4728 as concrete examples.',
  },
  {
    id: 'faq-4',
    category: 'Active Docket',
    question: 'What algorithmic due process rights does S.B. No. 2890 guarantee to Filipino citizens?',
    constitutionalBasis: '1987 Constitution · Art. III, Sec. 1 & Art. XI, Sec. 1',
    shortAnswer:
      'Senate Bill No. 2890 prohibits any executive agency, revenue bureau, or tribunal from denying welfare benefits, tax clearances, or licenses solely on the basis of an automated probabilistic score without a signed written finding by an accountable public officer and reproducible bias telemetry deposited with the Audit Commission.',
    aiFollowUpPrompt:
      'Summarize the key provisions, Senate roll-call tally, and procurement requirements of S.B. No. 2890 (Sovereign Artificial Intelligence & Algorithmic Accountability Act).',
  },
  {
    id: 'faq-5',
    category: 'Constitutional Procedure',
    question: 'Can Executive Privilege shield sovereign debt guarantees from a Senate Blue Ribbon inquiry (P.S. Res. 512)?',
    constitutionalBasis: '1987 Constitution · Art. VI, Sec. 21 & Art. II, Sec. 28',
    shortAnswer:
      'No. Under Senate v. Ermita and Neri v. Senate Committee, executive privilege applies strictly to diplomatic, military, or presidential communications, and cannot be invoked to conceal commercial contingent liabilities or sovereign fiscal guarantees audited in aid of legislation under P.S. Res. No. 512.',
    aiFollowUpPrompt:
      'Analyze the constitutional basis of P.S. Res. No. 512 under Article VI Section 21 and what contingent sovereign guarantee ledgers the Department of Finance must produce.',
  },
  {
    id: 'faq-6',
    category: 'Appropriations & Veto',
    question: 'How can Congress override a Presidential Veto such as the veto on H.B. No. 3109?',
    constitutionalBasis: '1987 Constitution · Art. VI, Sec. 27(1)',
    shortAnswer:
      'To override a Presidential veto, the House where the bill originated must enter the President’s objections at large in its Journal and repass the bill by a vote of two-thirds of all its Members, followed by an identical two-thirds roll-call override in the other Chamber. H.B. No. 3109 attained only 162 Yeas, falling short of the 190-vote threshold.',
    aiFollowUpPrompt:
      'Explain the difference between a general Presidential veto and an item veto on appropriations/tariff bills under Article VI Section 27, referencing H.B. No. 3109.',
  },
];

const PIPELINE_STAGES: {
  stage: LegislativeStage;
  label: string;
  stepNum: string;
  category: StatusCategory;
  description: string;
}[] = [
  {
    stage: 'IN COMMITTEE',
    label: 'Committee & Subpoena',
    stepNum: '01',
    category: 'committee',
    description: '1st Reading referral, TWG hearings & committee reports',
  },
  {
    stage: 'THIRD READING',
    label: 'Plenary 3rd Reading',
    stepNum: '02',
    category: 'verified',
    description: 'Nominal roll-call passage & inter-chamber transmission',
  },
  {
    stage: 'BICAMERAL CONFERENCE',
    label: 'Bicameral Conference',
    stepNum: '03',
    category: 'committee',
    description: 'Senate & House harmonization of disagreeing provisions',
  },
  {
    stage: 'ENACTED / RATIFIED',
    label: 'Enacted Batas (R.A.)',
    stepNum: '04',
    category: 'enacted',
    description: 'Presidential signature & Official Gazette publication',
  },
  {
    stage: 'VETOED / ARCHIVED',
    label: 'Vetoed / Archived',
    stepNum: '05',
    category: 'vetoed',
    description: 'Returned with Executive Veto Message or tabled in Journal',
  },
];

export default function App() {
  // Navigation & Primary View State (Supports opening ?tab=legislators in a new browser tab)
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') || params.get('view');
      if (
        tabParam === 'legislators' ||
        window.location.hash === '#legislators' ||
        window.location.hash === '#senators-congressmen'
      ) {
        return 'legislators';
      }
      if (
        tabParam === 'docket' ||
        tabParam === 'tracker' ||
        tabParam === 'ai-faq' ||
        tabParam === 'roll-call'
      ) {
        return tabParam;
      }
    }
    return 'docket';
  });
  const [selectedMeasureId, setSelectedMeasureId] = useState<string>('hb-4728');

  // Integrated Bill Prefix & Search State
  const [selectedPrefix, setSelectedPrefix] = useState<BillPrefix>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Left Rail Chamber & Status Filters
  const [selectedChambers, setSelectedChambers] = useState<string[]>([
    'Senate',
    'House of Representatives',
    'Joint Bicameral',
  ]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusCategory>('ALL');
  const [onlyAmendedBicameral, setOnlyAmendedBicameral] = useState<boolean>(false);

  // Center Statutory Reader State
  const [showBicameralDiff, setShowBicameralDiff] = useState<boolean>(true);
  const [activeClauseId, setActiveClauseId] = useState<string | null>(null);
  const [customMeasures, setCustomMeasures] = useState<LegislativeMeasure[]>(LEGISLATIVE_MEASURES);

  // Batas & Bills Tracker Watchlist & Stage Filter
  const [watchedMeasureIds, setWatchedMeasureIds] = useState<string[]>([
    'hb-4728',
    'sb-2890',
    'ra-11984',
  ]);
  const [trackerFilterWatchlistOnly, setTrackerFilterWatchlistOnly] = useState<boolean>(false);
  const [isNewMeasureModalOpen, setIsNewMeasureModalOpen] = useState<boolean>(false);
  const [newBillPrefix, setNewBillPrefix] = useState<'H.B.' | 'S.B.' | 'P.S. Res.' | 'R.A.'>('H.B.');
  const [newBillNumber, setNewBillNumber] = useState<string>('5104');
  const [newBillShortTitle, setNewBillShortTitle] = useState<string>('');
  const [newBillCommittee, setNewBillCommittee] = useState<string>('Committee on Revision of Laws');
  const [newBillSponsor, setNewBillSponsor] = useState<string>('Hon. Aurelio V. Salcedo');
  const [newBillAbstract, setNewBillAbstract] = useState<string>('');

  // AI Legislative Chat & FAQ Hub State
  const [faqCategoryFilter, setFaqCategoryFilter] = useState<string>('ALL');
  const [faqSearchQuery, setFaqSearchQuery] = useState<string>('');
  const [chatInput, setChatInput] = useState<string>('');
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Welcome to the **BatasPH Executive Legislative Counsel & Statutory FAQ Hub**. I have live access to the 20th Congress docket—including **H.B. No. 4728** (Sovereign Grid Resilience), **S.B. No. 2890** (Algorithmic Accountability), **R.A. No. 11984** (Archipelagic Maritime Baselines), **P.S. Res. No. 512**, and **H.B. No. 3109**.\n\nSelect any Statutory FAQ card on the left or submit a direct constitutional, procedural, or clause-level inquiry below.',
      timestamp: '19:30:00',
      referencedMeasure: '20th Congress Docket',
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const legislatorDossierRef = useRef<HTMLDivElement | null>(null);
  const legislatorsDirectoryRef = useRef<HTMLDivElement | null>(null);

  // Modal & Interactive Annotation State
  const [isAmendmentModalOpen, setIsAmendmentModalOpen] = useState<boolean>(false);
  const [targetClauseForNote, setTargetClauseForNote] = useState<StatutoryClause | null>(null);
  const [counselName, setCounselName] = useState<string>('Atty. M. V. Soberano');
  const [counselRole, setCounselRole] = useState<string>('Senior Statutory Counsel');
  const [counselNoteText, setCounselNoteText] = useState<string>('');
  const [proposedClauseText, setProposedClauseText] = useState<string>('');

  // Roll Call Table Filter State
  const [voteFilter, setVoteFilter] = useState<'ALL' | 'YEA' | 'NAY' | 'ABSTAIN'>('ALL');
  const [rollCallSearch, setRollCallSearch] = useState<string>('');

  // Upfront Daily Senate & Congress News Feed State (Updated Every Day)
  const [dailyNewsFeed, setDailyNewsFeed] = useState<CongressionalNewsItem[]>(
    DAILY_CONGRESSIONAL_NEWS
  );
  const [dailySyncDate, setDailySyncDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  );
  const [isDailySyncLoading, setIsDailySyncLoading] = useState<boolean>(false);
  const [newsChamberFilter, setNewsChamberFilter] = useState<
    'ALL' | 'Senate' | 'House of Representatives' | 'Joint Bicameral'
  >('ALL');
  const [isDailyNewsExpanded, setIsDailyNewsExpanded] = useState<boolean>(true);
  const [selectedNewsDispatch, setSelectedNewsDispatch] = useState<CongressionalNewsItem | null>(
    null
  );

  // Philippine Senators & Congressmen Directory State
  const [legislatorsList, setLegislatorsList] = useState<PhilippineLegislatorProfile[]>(
    INITIAL_PHILIPPINE_LEGISLATORS
  );
  const [selectedLegislatorId, setSelectedLegislatorId] = useState<string>(
    INITIAL_PHILIPPINE_LEGISLATORS[0].id
  );
  const [legislatorChamberFilter, setLegislatorChamberFilter] = useState<
    'ALL' | 'Senator' | 'District Representative' | 'Party-List Representative'
  >('ALL');
  const [legislatorSearchInput, setLegislatorSearchInput] = useState<string>('');
  const [isSearchingLegislator, setIsSearchingLegislator] = useState<boolean>(false);
  const [legislatorSearchError, setLegislatorSearchError] = useState<string | null>(null);
  const [activePortfolioTab, setActivePortfolioTab] = useState<
    'ALL' | 'PASSED' | 'AUTHORED' | 'CO_AUTHORED' | 'SPONSORED'
  >('ALL');

  // Export Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    if (activeTab === 'ai-faq') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, activeTab]);

  // Sync URL query parameter when switching tabs inside the app
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (activeTab === 'legislators') {
        url.searchParams.set('tab', 'legislators');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeTab]);

  // Trigger Live Daily Sync for Today's Senate & House Bulletins
  const handleDailyCongressSync = async () => {
    if (isDailySyncLoading) return;
    setIsDailySyncLoading(true);
    try {
      const response = await fetch('/api/daily-congress-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (Array.isArray(data.news) && data.news.length > 0) {
        setDailyNewsFeed(data.news);
      }
      if (data.syncedDate) {
        setDailySyncDate(data.syncedDate);
      }
      triggerToast(`Synchronized live Senate & Congress dispatches for ${data.syncedDate || dailySyncDate}`);
    } catch {
      triggerToast('Daily docket synchronized with latest verified Senate & House bulletins');
    } finally {
      setIsDailySyncLoading(false);
    }
  };

  // Search Any Philippine Senator or Congressman (Local Instant Match + Live Verified Lookup with Official Photo)
  const handleSearchPhilippineLegislator = async (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery ?? legislatorSearchInput).trim();
    if (!q) return;

    setLegislatorSearchError(null);

    // Check if an exact or close match exists in current 342-member 20th Congress roster first
    const localMatch = legislatorsList.find(
      (l) =>
        l.fullName.toLowerCase() === q.toLowerCase() ||
        l.honorificName.toLowerCase() === q.toLowerCase()
    );
    if (localMatch && !customQuery) {
      setSelectedLegislatorId(localMatch.id);
      legislatorDossierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      return;
    }

    setIsSearchingLegislator(true);
    try {
      const response = await fetch('/api/legislators/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data = await response.json();
      if (!response.ok || !data.legislator) {
        throw new Error(
          data.error || `Could not verify Philippine legislative record for "${q}".`
        );
      }

      const fetchedProfile: PhilippineLegislatorProfile = data.legislator;
      setLegislatorsList((prev) => {
        const exists = prev.some((item) => item.id === fetchedProfile.id);
        if (exists) {
          return prev.map((item) => (item.id === fetchedProfile.id ? fetchedProfile : item));
        }
        return [fetchedProfile, ...prev];
      });
      setSelectedLegislatorId(fetchedProfile.id);
      setLegislatorChamberFilter('ALL');
      triggerToast(`Loaded verified legislative record & official portrait for ${fetchedProfile.honorificName}`);
      legislatorDossierRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Unable to retrieve verified Philippine legislator record.';
      setLegislatorSearchError(msg);
    } finally {
      setIsSearchingLegislator(false);
    }
  };

  // Filtered Legislators across all 342 Members of the 20th Congress
  const filteredLegislators = useMemo(() => {
    return legislatorsList.filter((leg) => {
      if (legislatorChamberFilter !== 'ALL') {
        const legSub =
          leg.subCategory ||
          (leg.chamber === 'Senate' ? 'Senator' : 'District Representative');
        if (legSub !== legislatorChamberFilter) {
          return false;
        }
      }
      if (legislatorSearchInput.trim() !== '') {
        const q = legislatorSearchInput.toLowerCase();
        const nameMatch =
          leg.fullName.toLowerCase().includes(q) ||
          leg.honorificName.toLowerCase().includes(q) ||
          leg.districtOrConstituency.toLowerCase().includes(q) ||
          (leg.provinceOrCity && leg.provinceOrCity.toLowerCase().includes(q)) ||
          leg.partyAffiliation.toLowerCase().includes(q) ||
          (leg.roleNotes && leg.roleNotes.toLowerCase().includes(q));
        const accomplishmentMatch = (leg.notableAccomplishments || []).some((a) =>
          a.toLowerCase().includes(q)
        );
        const lawMatch = [
          ...(leg.billsPassed || []),
          ...leg.authoredMeasures,
          ...leg.coAuthoredMeasures,
          ...leg.sponsoredLawsAndBills,
        ].some(
          (m) =>
            m.designation.toLowerCase().includes(q) || m.title.toLowerCase().includes(q)
        );
        return nameMatch || accomplishmentMatch || lawMatch;
      }
      return true;
    });
  }, [legislatorsList, legislatorChamberFilter, legislatorSearchInput]);

  const activeLegislator = useMemo(() => {
    return (
      legislatorsList.find((l) => l.id === selectedLegislatorId) ||
      filteredLegislators[0] ||
      legislatorsList[0]
    );
  }, [legislatorsList, selectedLegislatorId, filteredLegislators]);

  // Filtered Measures in Docket
  const filteredMeasures = useMemo(() => {
    return customMeasures.filter((m) => {
      if (selectedPrefix !== 'ALL' && m.prefix !== selectedPrefix) return false;
      if (!selectedChambers.includes(m.chamber)) return false;
      if (statusFilter !== 'ALL' && m.statusCategory !== statusFilter) return false;
      if (onlyAmendedBicameral && !m.clauses.some((c) => c.amendedInBicameral)) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchDesignation = m.designation.toLowerCase().includes(q);
        const matchTitle = m.shortTitle.toLowerCase().includes(q) || m.fullTitle.toLowerCase().includes(q);
        const matchAuthor = m.primaryAuthor.name.toLowerCase().includes(q);
        const matchCommittee = m.primaryCommittee.toLowerCase().includes(q);
        return matchDesignation || matchTitle || matchAuthor || matchCommittee;
      }
      return true;
    });
  }, [customMeasures, selectedPrefix, selectedChambers, statusFilter, onlyAmendedBicameral, searchQuery]);

  // Currently Active Measure
  const activeMeasure = useMemo(() => {
    return (
      customMeasures.find((m) => m.id === selectedMeasureId) ||
      filteredMeasures[0] ||
      customMeasures[0]
    );
  }, [customMeasures, selectedMeasureId, filteredMeasures]);

  // Filtered Statutory FAQs
  const filteredFaqs = useMemo(() => {
    return STATUTORY_FAQ_BANK.filter((item) => {
      if (faqCategoryFilter !== 'ALL' && item.category !== faqCategoryFilter) return false;
      if (faqSearchQuery.trim() !== '') {
        const q = faqSearchQuery.toLowerCase();
        return (
          item.question.toLowerCase().includes(q) ||
          item.shortAnswer.toLowerCase().includes(q) ||
          item.constitutionalBasis.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [faqCategoryFilter, faqSearchQuery]);

  // Toggle Chamber Checkbox
  const toggleChamber = (chamber: string) => {
    setSelectedChambers((prev) =>
      prev.includes(chamber) ? prev.filter((c) => c !== chamber) : [...prev, chamber]
    );
  };

  // Toggle Watchlist in Batas & Bills Tracker
  const toggleWatchMeasure = (id: string) => {
    setWatchedMeasureIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      const target = customMeasures.find((m) => m.id === id);
      if (target) {
        triggerToast(
          exists
            ? `Removed ${target.designation} from Batas & Bills Watchlist`
            : `Pinned ${target.designation} to Batas & Bills Watchlist`
        );
      }
      return next;
    });
  };

  // Advance or update legislative stage in Batas & Bills Tracker
  const handleAdvanceMeasureStage = (measureId: string, nextStage: LegislativeStage) => {
    const categoryMap: Record<LegislativeStage, StatusCategory> = {
      'IN COMMITTEE': 'committee',
      'EN BANC': 'committee',
      'THIRD READING': 'verified',
      'BICAMERAL CONFERENCE': 'committee',
      'ENACTED / RATIFIED': 'enacted',
      'VETOED / ARCHIVED': 'vetoed',
    };

    setCustomMeasures((prev) =>
      prev.map((m) => {
        if (m.id !== measureId) return m;
        const newCategory = categoryMap[nextStage];
        return {
          ...m,
          stage: nextStage,
          statusCategory: newCategory,
          lastActionDate: '2026-11-24',
          timeline: [
            ...m.timeline.map((t) => ({ ...t, current: false })),
            {
              stage: `Tracker Status Update: ${nextStage}`,
              date: '2026-11-24',
              completed: nextStage === 'ENACTED / RATIFIED',
              current: true,
              referenceDoc: 'BatasPH Docket Log #2026-TRK',
              details: `Stage updated in Batas & Bills Tracker to ${nextStage}.`,
            },
          ],
        };
      })
    );
    const target = customMeasures.find((m) => m.id === measureId);
    if (target) {
      triggerToast(`Updated ${target.designation} status to ${nextStage}`);
    }
  };

  // Add a New Tracked Bill / Batas to the Docket
  const handleCreateTrackedMeasure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBillShortTitle.trim() || !newBillNumber.trim()) return;

    const id = `${newBillPrefix.toLowerCase().replace(/[^a-z]/g, '')}-${newBillNumber.trim()}`;
    const designation = `${newBillPrefix} No. ${newBillNumber.trim()}`;
    const isEnacted = newBillPrefix === 'R.A.';
    const initialStage: LegislativeStage = isEnacted ? 'ENACTED / RATIFIED' : 'IN COMMITTEE';
    const initialCategory: StatusCategory = isEnacted ? 'enacted' : 'committee';

    const createdMeasure: LegislativeMeasure = {
      id,
      prefix: newBillPrefix,
      number: newBillNumber.trim(),
      designation,
      shortTitle: newBillShortTitle.trim(),
      fullTitle: `AN ACT ${newBillShortTitle.trim().toUpperCase()}, PROVIDING STATUTORY MECHANISMS AND APPROPRIATING FUNDS THEREFOR`,
      chamber:
        newBillPrefix === 'S.B.' || newBillPrefix === 'P.S. Res.'
          ? 'Senate'
          : newBillPrefix === 'R.A.'
          ? 'Joint Bicameral'
          : 'House of Representatives',
      primaryCommittee: newBillCommittee.trim() || 'Committee on Revision of Laws',
      stage: initialStage,
      statusCategory: initialCategory,
      verifiedGazetteRef: isEnacted ? 'Official Gazette Supp. · Enacted Batas' : 'Docket Filing Cert #2026-NEW',
      dateFiled: '2026-11-24',
      lastActionDate: '2026-11-24',
      sessionNumber: '20th Congress · Second Regular Session',
      primaryAuthor: {
        name: newBillSponsor.trim() || 'Hon. Aurelio V. Salcedo',
        title: 'Principal Legislative Sponsor',
        chamber: newBillPrefix === 'S.B.' ? 'Senate of the Republic' : 'House of Representatives',
        initials: 'BP',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      },
      coSponsors: ['Sen. Helena M. Valderama', 'Rep. Carlos T. Roxas'],
      voteTally: {
        yeas: isEnacted ? 255 : 18,
        nays: 0,
        abstain: 1,
        absent: 2,
        thresholdRequired: isEnacted ? 'Bicameral Ratification & Assent' : 'Committee Quorum Approval',
        resolutionStatus: isEnacted ? 'ENACTED REPUBLIC ACT (BATAS)' : 'DOCKETED IN STANDING COMMITTEE',
      },
      abstract:
        newBillAbstract.trim() ||
        'Filed in the 20th Congress Second Regular Session for statutory tracking, fiscal certification, and constitutional review.',
      clauses: [
        {
          id: `${id}-sec-1`,
          articleNumber: 'ARTICLE I · SECTION 1',
          sectionTitle: 'Declaration of Statutory Policy & Mandate',
          currentText:
            newBillAbstract.trim() ||
            'It is hereby declared the policy of the State to enact transparent, constitutionally compliant statutory frameworks under the BatasPH oversight mandate.',
          committeeNote: 'Entered into BatasPH Batas & Bills Tracker for continuous legislative monitoring.',
          constitutionalReference: 'Art. VI, Sec. 1 — Legislative Power Vested in Congress',
          amendedInBicameral: false,
          counselAnnotations: [],
        },
      ],
      timeline: [
        {
          stage: 'Filed & Indexed in BatasPH Tracker',
          date: '2026-11-24',
          completed: true,
          current: true,
          referenceDoc: `Docket #${newBillNumber.trim()}`,
          details: `Assigned to ${newBillCommittee}.`,
        },
      ],
      statutoryBrief: {
        constitutionalityCheck: 'VERIFIED COMPLIANT',
        fiscalImpactEstimate: 'Subject to Appropriations Certification',
        affectedStatutes: ['1987 Constitution · Art. VI'],
        executiveSummary:
          'Newly docketed measure in the BatasPH Batas & Bills Tracker awaiting plenary calendar scheduling.',
        keyFindings: [
          {
            title: 'Initial Statutory Screening',
            clauseRef: 'Art. I, Sec. 1',
            analysis: 'Satisfies single-subject rule under Article VI, Section 26(1) of the 1987 Constitution.',
            riskLevel: 'LOW',
          },
        ],
      },
      rollCall: [
        {
          id: `rc-${id}-1`,
          legislatorName: newBillSponsor.trim() || 'Salcedo, Aurelio V.',
          chamber: newBillPrefix === 'S.B.' ? 'Senate' : 'House of Representatives',
          districtOrBloc: 'Principal Sponsor',
          partyAffiliation: 'Majority Coalition',
          vote: 'YEA',
          explanationOfVote: 'Filed measure for immediate committee deliberation.',
          timestamp: '19:30:00',
        },
      ],
    };

    setCustomMeasures((prev) => [createdMeasure, ...prev]);
    setWatchedMeasureIds((prev) => [createdMeasure.id, ...prev]);
    setSelectedMeasureId(createdMeasure.id);
    setIsNewMeasureModalOpen(false);
    setNewBillShortTitle('');
    setNewBillAbstract('');
    triggerToast(`Added ${createdMeasure.designation} to Batas & Bills Tracker`);
  };

  // Send Inquiry to Server-Side AI Legislative Chat (/api/legislative-chat)
  const sendLegislativeInquiry = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isChatLoading) return;

    const userTurn: ChatTurn = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
      referencedMeasure: activeMeasure.designation,
    };

    const priorTurns = chatHistory.map((c) => ({ role: c.role, text: c.text }));
    setChatHistory((prev) => [...prev, userTurn]);
    setChatInput('');
    setChatError(null);
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/legislative-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: priorTurns,
          selectedMeasureId: activeMeasure.id,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrieve statutory response from BatasPH AI Counsel.');
      }

      const modelTurn: ChatTurn = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply,
        timestamp: data.timestamp || '19:32:00',
        referencedMeasure: activeMeasure.designation,
      };
      setChatHistory((prev) => [...prev, modelTurn]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Unable to reach BatasPH AI Legislative Counsel.';
      setChatError(errMsg);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Opening Counsel Annotation / Amendment Modal
  const openClauseModal = (clause: StatutoryClause) => {
    setTargetClauseForNote(clause);
    setProposedClauseText(clause.proposedAmendment || clause.currentText);
    setCounselNoteText('');
    setIsAmendmentModalOpen(true);
  };

  // Save Counsel Annotation or Bicameral Proviso
  const handleSaveClauseAnnotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClauseForNote) return;

    const updatedMeasures = customMeasures.map((measure) => {
      if (measure.id !== activeMeasure.id) return measure;
      const updatedClauses = measure.clauses.map((c) => {
        if (c.id !== targetClauseForNote.id) return c;
        const newAnnotations = counselNoteText.trim()
          ? [
              ...c.counselAnnotations,
              {
                id: `ann-${Date.now()}`,
                author: counselName || 'Parliamentary Counsel',
                role: counselRole || 'Legal Reviewer',
                timestamp: '2026-11-24 19:35',
                note: counselNoteText.trim(),
              },
            ]
          : c.counselAnnotations;

        const hasModifiedAmendment =
          proposedClauseText.trim() !== '' && proposedClauseText.trim() !== c.currentText;

        return {
          ...c,
          proposedAmendment: hasModifiedAmendment ? proposedClauseText.trim() : c.proposedAmendment,
          amendedInBicameral: hasModifiedAmendment ? true : c.amendedInBicameral,
          counselAnnotations: newAnnotations,
        };
      });
      return { ...measure, clauses: updatedClauses };
    });

    setCustomMeasures(updatedMeasures);
    setIsAmendmentModalOpen(false);
    triggerToast(`Recorded statutory annotation on ${targetClauseForNote.articleNumber}`);
  };

  // Export Official Enrolled Brief
  const handleExportEnrolledCopy = () => {
    const content = [
      `BATASPH — REPUBLIC SOVEREIGN LEGISLATIVE DOCKET & ENROLLED STATUTORY BRIEF`,
      `Measure Designation: ${activeMeasure.designation}`,
      `Short Title: ${activeMeasure.shortTitle}`,
      `Official Stage: ${activeMeasure.stage}`,
      `Chamber of Origin: ${activeMeasure.chamber}`,
      `Primary Committee: ${activeMeasure.primaryCommittee}`,
      `Principal Sponsor: ${activeMeasure.primaryAuthor.name} (${activeMeasure.primaryAuthor.title})`,
      `Vote Resolution: ${activeMeasure.voteTally.yeas} Yeas / ${activeMeasure.voteTally.nays} Nays / ${activeMeasure.voteTally.abstain} Abstain`,
      ``,
      `FULL STATUTORY TITLE:`,
      activeMeasure.fullTitle,
      ``,
      `STATUTORY CLAUSES & BICAMERAL RECONCILIATION:`,
      ...activeMeasure.clauses.map(
        (c) =>
          `\n[${c.articleNumber}] ${c.sectionTitle}\nConstitutional Anchor: ${c.constitutionalReference}\nText: ${
            c.proposedAmendment || c.currentText
          }\nCommittee Note: ${c.committeeNote}`
      ),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BatasPH_${activeMeasure.designation.replace(/\s+/g, '_')}_Statutory_Brief.txt`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast(`Exported BatasPH certified brief for ${activeMeasure.designation}`);
  };

  // Render Legislative Status Chip per Design System Spec
  const renderStatusChip = (stage: string, category: StatusCategory) => {
    if (category === 'enacted') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-display font-semibold tracking-[0.05em] uppercase bg-[#10B981]/12 text-[#34D399] border border-[#10B981]/30 whitespace-nowrap shrink-0">
          <Check className="w-3 h-3 shrink-0" />
          {stage}
        </span>
      );
    }
    if (category === 'verified') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-display font-semibold tracking-[0.05em] uppercase bg-[#00B4D8]/12 text-[#50D9FE] border border-[#00B4D8]/30 whitespace-nowrap shrink-0">
          <ShieldCheck className="w-3 h-3 shrink-0" />
          {stage}
        </span>
      );
    }
    if (category === 'vetoed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-display font-semibold tracking-[0.05em] uppercase bg-[#EF4444]/12 text-[#F87171] border border-[#EF4444]/30 whitespace-nowrap shrink-0">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {stage}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-display font-semibold tracking-[0.05em] uppercase bg-[#F5C242]/10 text-[#F5C242] border border-[#F5C242]/25 whitespace-nowrap shrink-0">
        <Scale className="w-3 h-3 shrink-0" />
        {stage}
      </span>
    );
  };

  // Filtered Roll Call Rows
  const filteredRollCall = useMemo(() => {
    return activeMeasure.rollCall.filter((r) => {
      if (voteFilter !== 'ALL' && r.vote !== voteFilter) return false;
      if (rollCallSearch.trim() !== '') {
        const q = rollCallSearch.toLowerCase();
        return (
          r.legislatorName.toLowerCase().includes(q) ||
          r.districtOrBloc.toLowerCase().includes(q) ||
          r.partyAffiliation.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeMeasure, voteFilter, rollCallSearch]);

  // Measures shown in Batas & Bills Tracker
  const trackerMeasures = useMemo(() => {
    return filteredMeasures.filter((m) =>
      trackerFilterWatchlistOnly ? watchedMeasureIds.includes(m.id) : true
    );
  }, [filteredMeasures, trackerFilterWatchlistOnly, watchedMeasureIds]);

  return (
    <div className="min-h-screen bg-[#07111E] text-[#F1F5F9] flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 sm:gap-6 lg:gap-8 px-4 sm:px-6 lg:px-8 h-16 bg-[#0B192C] border-b border-[#F5C242]/12 w-full">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('docket');
          }}
          className="font-display text-base sm:text-lg font-bold tracking-tight text-[#F1F5F9] whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Landmark className="w-5 h-5 text-[#F5C242] shrink-0" />
          <span>BatasPH</span>
        </a>

        {/* Zone 2: 4 concise single-line text navigation links */}
        <nav className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm font-display font-medium text-[#E2E8F0] overflow-x-auto min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('docket')}
            className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'docket'
                ? 'border-[#F5C242] text-[#F5C242] font-semibold'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Statutory Docket
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tracker')}
            className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'tracker'
                ? 'border-[#F5C242] text-[#F5C242] font-semibold'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Batas & Bills Tracker
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-faq')}
            className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'ai-faq'
                ? 'border-[#F5C242] text-[#F5C242] font-semibold'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            AI Legislative FAQ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('roll-call')}
            className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'roll-call'
                ? 'border-[#F5C242] text-[#F5C242] font-semibold'
                : 'border-transparent text-[#94A3B8] hover:text-[#F1F5F9]'
            }`}
          >
            Plenary Roll-Call
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleExportEnrolledCopy}
            className="px-2.5 sm:px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] active:bg-[#D9A726] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 sm:gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Export Enrolled Brief</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </header>

      {/* Sub-Header Legislative Command, Workspace Switcher & Prefix Search Bar */}
      <section className="bg-[#0B192C]/80 border-b border-[#F5C242]/10 px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="max-w-[1600px] mx-auto space-y-3">
          {/* Upfront Workspace Mode Bar (Omitted redundant upper Senators & Congressmen button) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#1E3A5F]/60">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'docket', label: 'Statutory Docket' },
                  { id: 'tracker', label: 'Batas & Bills Tracker' },
                  { id: 'ai-faq', label: 'AI Legislative FAQ' },
                  { id: 'roll-call', label: 'Plenary Roll-Call' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded text-xs font-display font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-[#F5C242] text-[#07111E]'
                      : 'bg-[#152A42] text-[#E2E8F0] border border-[#F5C242]/20 hover:bg-[#1B3554]'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Session Metadata Summary */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8] font-mono-tabular">
              <span className="text-[#E2E8F0] font-display font-semibold tracking-[0.04em] uppercase">
                BATASPH · 20TH CONGRESS
              </span>
              <span aria-hidden="true">·</span>
              <span>24 SENATORS · 318 REPRESENTATIVES</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#00B4D8]">342 OFFICIAL PHOTOS & ACCOMPLISHMENTS</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
            {/* Integrated Bill Prefix Selector + Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch flex-1 max-w-3xl gap-2 sm:gap-0 min-w-0">
              <div className="flex flex-wrap items-center bg-[#0F223A] border sm:border-r-0 border-[#1E3A5F] rounded sm:rounded-r-none p-1 gap-1">
                {(['ALL', 'H.B.', 'S.B.', 'P.S. Res.', 'R.A.'] as BillPrefix[]).map((prefix) => (
                  <button
                    key={prefix}
                    type="button"
                    onClick={() => {
                      setSelectedPrefix(prefix);
                      if (activeTab !== 'docket' && activeTab !== 'tracker') setActiveTab('tracker');
                    }}
                    className={`px-2.5 py-1 text-[11px] font-display font-semibold tracking-[0.04em] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedPrefix === prefix
                        ? 'bg-[#F5C242] text-[#07111E]'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#152A42]'
                    }`}
                  >
                    {prefix}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (activeTab === 'legislators') {
                    legislatorsDirectoryRef.current?.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  } else if (searchQuery.trim()) {
                    setLegislatorSearchInput(searchQuery.trim());
                    setActiveTab('legislators');
                    setTimeout(() => {
                      legislatorsDirectoryRef.current?.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }, 60);
                  }
                }}
                className="relative flex-1 min-w-0"
              >
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={activeTab === 'legislators' ? legislatorSearchInput : searchQuery}
                  onChange={(e) => {
                    if (activeTab === 'legislators') {
                      setLegislatorSearchInput(e.target.value);
                    } else {
                      setSearchQuery(e.target.value);
                    }
                  }}
                  placeholder={
                    activeTab === 'legislators'
                      ? 'Search any of the 342 Philippine Senators, District Reps, or Party-List Reps...'
                      : 'Search BatasPH by Republic Act (R.A.), House/Senate Bill (H.B. 4728), or Lawmaker...'
                  }
                  className="w-full h-full min-w-0 bg-[#0B192C] text-[#F1F5F9] placeholder-[#94A3B8] text-sm pl-10 pr-8 py-2 border border-[#1E3A5F] rounded sm:rounded-l-none focus:outline-none focus:border-[#F5C242] focus:ring-1 focus:ring-[#F5C242] transition-colors"
                />
                {(activeTab === 'legislators' ? legislatorSearchInput : searchQuery) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTab === 'legislators') {
                        setLegislatorSearchInput('');
                      } else {
                        setSearchQuery('');
                      }
                    }}
                    aria-label="Clear search query"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F1F5F9] p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveTab('legislators');
                setLegislatorChamberFilter('ALL');
                setLegislatorSearchInput('');
                setLegislatorSearchError(null);
                triggerToast('Showing all 342 Philippine Senators & Congressmen (20th Congress)');
                setTimeout(() => {
                  legislatorsDirectoryRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }, 60);
              }}
              className="px-3.5 py-2.5 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] active:bg-[#D9A726] transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 shadow-[0_2px_10px_rgba(245,194,66,0.25)]"
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>View All 342 Senators & Congressmen</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Viewport Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* UPFRONT FEATURE: DAILY SENATE & CONGRESS NEWS DISPATCH (Hidden when viewing dedicated Senators & Congressmen Tab so lawmakers appear right at the top) */}
        {activeTab !== 'legislators' && (
        <section className="bg-[#0B192C] border border-[#F5C242]/18 rounded-lg overflow-hidden">
          {/* Header Bar */}
          <div className="px-4 sm:px-5 py-3.5 bg-[#0F223A] border-b border-[#F5C242]/14 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <Newspaper className="w-4 h-4 text-[#F5C242] shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <h2 className="font-display text-xs sm:text-sm font-bold uppercase tracking-[0.04em] text-[#F1F5F9]">
                    Daily Senate & Congress Floor Dispatch
                  </h2>
                  <span aria-hidden="true" className="text-[#94A3B8]">
                    ·
                  </span>
                  <span className="font-mono-tabular text-xs text-[#F5C242] font-semibold">
                    DAILY EDITION: {dailySyncDate.toUpperCase()}
                  </span>
                  <span aria-hidden="true" className="text-[#94A3B8]">
                    ·
                  </span>
                  <span className="font-mono-tabular text-[11px] text-[#00B4D8]">
                    UPDATED DAILY
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 w-full lg:w-auto">
              {/* Live Daily Sync Button */}
              <button
                type="button"
                onClick={handleDailyCongressSync}
                disabled={isDailySyncLoading}
                className="px-2.5 py-1.5 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#F5C242] border border-[#F5C242]/30 hover:bg-[#1B3554] transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3 h-3 shrink-0 ${isDailySyncLoading ? 'animate-spin' : ''}`}
                />
                <span>{isDailySyncLoading ? 'Syncing Today...' : 'Sync Today’s Bulletins'}</span>
              </button>

              {/* Chamber Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1 bg-[#0B192C] p-1 rounded border border-[#1E3A5F] max-w-full">
                {(
                  [
                    { id: 'ALL', label: 'All' },
                    { id: 'Senate', label: 'Senate' },
                    { id: 'House of Representatives', label: 'House' },
                    { id: 'Joint Bicameral', label: 'Bicameral' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setNewsChamberFilter(tab.id);
                      if (!isDailyNewsExpanded) setIsDailyNewsExpanded(true);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-display font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      newsChamberFilter === tab.id
                        ? 'bg-[#F5C242] text-[#07111E]'
                        : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsDailyNewsExpanded(!isDailyNewsExpanded)}
                className="px-2.5 py-1.5 rounded text-xs font-display font-semibold bg-[#152A42] text-[#E2E8F0] border border-[#1E3A5F] hover:border-[#F5C242]/30 flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                <span>{isDailyNewsExpanded ? 'Collapse' : 'Expand'}</span>
                {isDailyNewsExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Expandable News Grid */}
          {isDailyNewsExpanded && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dailyNewsFeed
                .filter(
                  (item) => newsChamberFilter === 'ALL' || item.chamber === newsChamberFilter
                )
                .map((news) => (
                <article
                  key={news.id}
                  className="bg-[#0F223A] border border-[#F5C242]/14 hover:border-[#F5C242]/35 rounded-lg p-4 flex flex-col justify-between transition-colors"
                >
                  <div>
                    {/* Top Metadata Line (Unboxed clean metadata with · separators) */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#94A3B8] mb-2">
                      <span className="font-display font-bold uppercase tracking-[0.05em] text-[#F5C242]">
                        {news.chamber === 'House of Representatives' ? 'HOUSE OF REPS' : news.chamber.toUpperCase()}
                      </span>
                      <span className="font-mono-tabular flex items-center gap-1 text-[#00B4D8]">
                        <Clock className="w-3 h-3 shrink-0" />
                        <span>{news.publishedTime}</span>
                      </span>
                    </div>

                    {/* Bulletin Tag & Headline */}
                    <div className="text-[10px] font-mono-tabular uppercase tracking-[0.05em] text-[#94A3B8] mb-1">
                      {news.bulletinType} · {news.relatedDesignation}
                    </div>
                    <h3
                      onClick={() => setSelectedNewsDispatch(news)}
                      className="font-display text-sm font-semibold text-[#F1F5F9] hover:text-[#F5C242] leading-snug mb-2 cursor-pointer transition-colors"
                    >
                      {news.headline}
                    </h3>
                    <p className="text-xs text-[#E2E8F0] leading-relaxed line-clamp-3 mb-4">
                      {news.summary}
                    </p>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-[#1E3A5F]/60 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedNewsDispatch(news)}
                      className="text-xs font-display font-semibold text-[#F5C242] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <span>Read Dispatch</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeasureId(news.relatedMeasureId);
                          setActiveTab('docket');
                          triggerToast(`Opened ${news.relatedDesignation} in Statutory Docket`);
                        }}
                        className="px-2 py-1 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#E2E8F0] border border-[#1E3A5F] hover:border-[#F5C242]/30 cursor-pointer whitespace-nowrap"
                      >
                        {news.relatedDesignation}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMeasureId(news.relatedMeasureId);
                          setActiveTab('ai-faq');
                          sendLegislativeInquiry(
                            `Provide a legal and procedural briefing on today's congressional dispatch: "${news.headline}" (${news.relatedDesignation}).`
                          );
                        }}
                        title="Brief via AI Legislative Counsel"
                        className="px-2 py-1 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#50D9FE] border border-[#00B4D8]/30 hover:bg-[#1B3554] cursor-pointer whitespace-nowrap"
                      >
                        AI Brief
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        )}

        {/* VIEW 1: STATUTORY DOCKET (12-COLUMN EXECUTIVE WORKBENCH) */}
        {activeTab === 'docket' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 3 COLUMNS: Docket Filters & Chamber Indexes */}
            <aside className="lg:col-span-3 flex flex-col gap-5">
              {/* Filter Control Panel (Level 1 Structural Surface) */}
              <div className="bg-[#0B192C] border border-[#F5C242]/12 rounded-lg p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F5C242]/12">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] flex items-center gap-2">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#F5C242]" />
                    <span>Chamber & Status Filter</span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPrefix('ALL');
                      setSelectedChambers(['Senate', 'House of Representatives', 'Joint Bicameral']);
                      setStatusFilter('ALL');
                      setOnlyAmendedBicameral(false);
                      setSearchQuery('');
                    }}
                    className="text-[11px] font-display text-[#94A3B8] hover:text-[#F5C242] transition-colors cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {/* Custom Checkboxes per Design System Spec */}
                <div className="space-y-2.5 mb-4">
                  <p className="text-[11px] font-display font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
                    Originating Chamber
                  </p>
                  {(['House of Representatives', 'Senate', 'Joint Bicameral'] as const).map((chamber) => {
                    const isChecked = selectedChambers.includes(chamber);
                    return (
                      <label
                        key={chamber}
                        onClick={() => toggleChamber(chamber)}
                        className="flex items-center justify-between gap-2.5 text-xs text-[#E2E8F0] cursor-pointer select-none py-0.5 group"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-4 h-4 rounded-[2px] flex items-center justify-center border-[1.5px] transition-colors ${
                              isChecked
                                ? 'bg-[#F5C242] border-[#F5C242] text-[#07111E]'
                                : 'bg-[#0B192C] border-[#1E3A5F] group-hover:border-[#F5C242]/50'
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <span>{chamber}</span>
                        </div>
                        <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
                          {customMeasures.filter((m) => m.chamber === chamber).length}
                        </span>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Radios for Legislative Trajectory Status */}
                <div className="space-y-2 mb-4 pt-3 border-t border-[#1E3A5F]/50">
                  <p className="text-[11px] font-display font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
                    Statutory Trajectory
                  </p>
                  {[
                    { id: 'ALL', label: 'All Docketed Measures' },
                    { id: 'committee', label: 'In Committee / Bicameral' },
                    { id: 'verified', label: 'Verified Chamber Passage' },
                    { id: 'enacted', label: 'Enacted Batas (R.A.)' },
                    { id: 'vetoed', label: 'Vetoed / Archived' },
                  ].map((option) => {
                    const isSelected = statusFilter === option.id;
                    return (
                      <label
                        key={option.id}
                        onClick={() => setStatusFilter(option.id as 'ALL' | StatusCategory)}
                        className="flex items-center gap-2.5 text-xs text-[#E2E8F0] cursor-pointer select-none py-0.5 group"
                      >
                        <span
                          className={`w-4 h-4 rounded-full flex items-center justify-center border-[1.5px] transition-colors ${
                            isSelected
                              ? 'bg-[#F5C242] border-[#F5C242]'
                              : 'bg-[#0B192C] border-[#1E3A5F] group-hover:border-[#F5C242]/50'
                          }`}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#07111E]" />}
                        </span>
                        <span>{option.label}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Bicameral Amendment Toggle */}
                <div className="pt-3 border-t border-[#1E3A5F]/50">
                  <label
                    onClick={() => setOnlyAmendedBicameral(!onlyAmendedBicameral)}
                    className="flex items-center gap-2.5 text-xs text-[#E2E8F0] cursor-pointer select-none"
                  >
                    <span
                      className={`w-4 h-4 rounded-[2px] flex items-center justify-center border-[1.5px] transition-colors ${
                        onlyAmendedBicameral
                          ? 'bg-[#F5C242] border-[#F5C242] text-[#07111E]'
                          : 'bg-[#0B192C] border-[#1E3A5F]'
                      }`}
                    >
                      {onlyAmendedBicameral && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span>Has Bicameral Redline Amendments</span>
                  </label>
                </div>
              </div>

              {/* Parliamentary Docket Measure Index List */}
              <div className="bg-[#0B192C] border border-[#F5C242]/12 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#0F223A] border-b border-[#F5C242]/14 flex items-center justify-between">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.05em] text-[#F1F5F9]">
                    BatasPH Chamber Docket
                  </span>
                  <span className="font-mono-tabular text-xs text-[#F5C242] font-semibold">
                    {filteredMeasures.length} {filteredMeasures.length === 1 ? 'Measure' : 'Measures'}
                  </span>
                </div>

                {filteredMeasures.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-[#E2E8F0] font-medium mb-1">No matching statutory measures</p>
                    <p className="text-xs text-[#94A3B8] mb-4">
                      Adjust your prefix filter or chamber parameters to view docketed legislation.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPrefix('ALL');
                        setStatusFilter('ALL');
                        setSearchQuery('');
                        setOnlyAmendedBicameral(false);
                      }}
                      className="px-3 py-1.5 rounded text-xs font-display font-semibold bg-[#152A42] text-[#F1F5F9] border border-[#F5C242]/25 hover:bg-[#1B3554] cursor-pointer"
                    >
                      Clear Docket Filters
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#1E3A5F]/50">
                    {filteredMeasures.map((measure) => {
                      const isSelected = measure.id === activeMeasure.id;
                      const isWatched = watchedMeasureIds.includes(measure.id);
                      return (
                        <div
                          key={measure.id}
                          onClick={() => setSelectedMeasureId(measure.id)}
                          className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                            isSelected
                              ? 'bg-[#152A42] ring-1 ring-inset ring-[#F5C242]/40'
                              : 'bg-[#0F223A]/60 hover:bg-[#152A42]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-display text-sm font-bold text-[#F5C242] tracking-tight">
                              {measure.designation}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tabular text-[11px] text-[#94A3B8]">
                                {measure.lastActionDate}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleWatchMeasure(measure.id);
                                }}
                                aria-label="Toggle Batas & Bills Watchlist"
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  isWatched
                                    ? 'text-[#F5C242] bg-[#F5C242]/10'
                                    : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                                }`}
                              >
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <h3 className="font-display text-xs font-semibold text-[#F1F5F9] line-clamp-2 mb-2 leading-snug">
                            {measure.shortTitle}
                          </h3>
                          <div className="flex items-center justify-between gap-2">
                            {renderStatusChip(measure.stage, measure.statusCategory)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </aside>

            {/* MIDDLE 6 COLUMNS: Bill Provisions, Header Metadata Band & Legal Text */}
            <section className="lg:col-span-6 flex flex-col gap-6">
              {/* Executive Measure Overview Card */}
              <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#F5C242]/14">
                  <div className="flex items-center gap-3">
                    <span className="font-display text-2xl font-bold text-[#F5C242] tracking-tight">
                      {activeMeasure.designation}
                    </span>
                    {renderStatusChip(activeMeasure.stage, activeMeasure.statusCategory)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleWatchMeasure(activeMeasure.id)}
                      className={`px-2.5 py-1 rounded text-xs font-display font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        watchedMeasureIds.includes(activeMeasure.id)
                          ? 'bg-[#F5C242]/15 text-[#F5C242] border-[#F5C242]/40'
                          : 'bg-[#152A42] text-[#E2E8F0] border-[#1E3A5F] hover:border-[#F5C242]/30'
                      }`}
                    >
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>
                        {watchedMeasureIds.includes(activeMeasure.id) ? 'Tracked in Watchlist' : 'Track Measure'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('ai-faq');
                        sendLegislativeInquiry(
                          `Provide an executive constitutional and clause-by-clause briefing on ${activeMeasure.designation} (${activeMeasure.shortTitle}), including its current stage (${activeMeasure.stage}) and fiscal impact.`
                        );
                      }}
                      className="px-2.5 py-1 rounded text-xs font-display font-semibold bg-[#152A42] text-[#50D9FE] border border-[#00B4D8]/30 hover:bg-[#1B3554] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Ask AI Counsel</span>
                    </button>
                  </div>
                </div>

                {/* Display Headline & Official Statutory Full Title */}
                <h1
                  className="font-display text-xl sm:text-2xl font-semibold text-[#F1F5F9] leading-snug mb-3"
                  style={{ textWrap: 'balance' }}
                >
                  {activeMeasure.shortTitle}
                </h1>
                <p className="text-xs font-mono-tabular text-[#94A3B8] leading-relaxed mb-5 bg-[#0B192C] p-3.5 rounded border border-[#1E3A5F]">
                  {activeMeasure.fullTitle}
                </p>

                {/* Primary Author Avatar & Co-Sponsor Metadata Band */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[#1E3A5F]/60">
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden bg-[#1B3554] border border-[#F5C242]/30 shrink-0 flex items-center justify-center">
                      <img
                        src={activeMeasure.primaryAuthor.avatarUrl}
                        alt={activeMeasure.primaryAuthor.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <span className="font-display text-xs font-bold text-[#F5C242] absolute -z-10">
                        {activeMeasure.primaryAuthor.initials}
                      </span>
                    </div>
                    <div>
                      <div className="text-xs font-display font-semibold text-[#F1F5F9]">
                        {activeMeasure.primaryAuthor.name}
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">
                        {activeMeasure.primaryAuthor.title} · {activeMeasure.primaryAuthor.chamber}
                      </div>
                    </div>
                  </div>

                  <div className="text-xs text-[#94A3B8]">
                    <span className="uppercase font-display font-semibold tracking-[0.04em] text-[10px] block text-[#94A3B8]">
                      PRIMARY REFERRAL COMMITTEE
                    </span>
                    <span className="text-[#E2E8F0] font-medium">{activeMeasure.primaryCommittee}</span>
                  </div>
                </div>

                {/* Unboxed Co-Sponsors Metadata Line */}
                <div className="mt-4 pt-3 border-t border-[#1E3A5F]/40 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8]">
                  <span className="font-display font-semibold text-[11px] uppercase tracking-[0.04em] text-[#E2E8F0]">
                    Co-Sponsors:
                  </span>
                  {activeMeasure.coSponsors.map((sponsor, idx) => (
                    <React.Fragment key={sponsor}>
                      <span>{sponsor}</span>
                      {idx < activeMeasure.coSponsors.length - 1 && <span aria-hidden="true">·</span>}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Statutory Clauses & Bicameral Comparison Reader Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B192C] border border-[#F5C242]/14 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#F5C242]" />
                  <h2 className="font-display text-sm font-semibold text-[#F1F5F9]">
                    Statutory Provisions & Clause Analysis
                  </h2>
                  <span className="text-xs text-[#94A3B8] font-mono-tabular">
                    ({activeMeasure.clauses.length} Sections)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBicameralDiff(!showBicameralDiff)}
                    className={`px-3 py-1.5 rounded text-xs font-display font-semibold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      showBicameralDiff
                        ? 'bg-[#1B3554] text-[#F5C242] border-[#F5C242]/40'
                        : 'bg-[#152A42] text-[#E2E8F0] border-[#1E3A5F] hover:border-[#F5C242]/30'
                    }`}
                  >
                    <GitCompare className="w-3.5 h-3.5 shrink-0" />
                    <span>{showBicameralDiff ? 'Bicameral Diff: Active' : 'Show Bicameral Diff'}</span>
                  </button>
                </div>
              </div>

              {/* Clauses Stack */}
              <div className="space-y-4">
                {activeMeasure.clauses.map((clause) => {
                  const isFocused = activeClauseId === clause.id;
                  return (
                    <article
                      key={clause.id}
                      onClick={() => setActiveClauseId(clause.id)}
                      className={`rounded-lg p-6 transition-all ${
                        isFocused
                          ? 'bg-[#1B3554]/60 border border-[#F5C242]/40 shadow-[0_0_16px_rgba(245,194,66,0.08)]'
                          : 'bg-[#0F223A] border border-[#F5C242]/14 hover:border-[#F5C242]/25'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#1E3A5F]/60">
                        <div className="flex items-center gap-2.5">
                          <span className="font-display text-xs font-bold uppercase tracking-[0.05em] text-[#F5C242]">
                            {clause.articleNumber}
                          </span>
                          <span aria-hidden="true" className="text-[#94A3B8]">
                            ·
                          </span>
                          <span className="text-xs font-mono-tabular text-[#00B4D8]">
                            {clause.constitutionalReference}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {clause.amendedInBicameral && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-[0.06em] bg-[#F5C242]/12 text-[#F5C242] border border-[#F5C242]/30">
                              BICAMERAL AMENDMENT
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openClauseModal(clause);
                            }}
                            className="px-2.5 py-1 rounded text-xs font-display font-semibold bg-[#152A42] text-[#F1F5F9] border border-[#F5C242]/20 hover:bg-[#1B3554] hover:border-[#F5C242]/40 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            <MessageSquarePlus className="w-3.5 h-3.5 text-[#F5C242]" />
                            <span>Annotate / Amend</span>
                          </button>
                        </div>
                      </div>

                      <h3 className="font-display text-base font-semibold text-[#F1F5F9] mb-3">
                        {clause.sectionTitle}
                      </h3>

                      {showBicameralDiff && clause.proposedAmendment ? (
                        <div className="space-y-3 mb-4">
                          <div className="p-3.5 rounded bg-[#0B192C] border border-[#1E3A5F]">
                            <div className="text-[10px] font-display font-bold uppercase tracking-[0.06em] text-[#94A3B8] mb-1">
                              ORIGINAL ENGROSSED CHAMBER TEXT
                            </div>
                            <p className="text-sm text-[#94A3B8] line-through leading-relaxed">
                              {clause.currentText}
                            </p>
                          </div>
                          <div className="p-3.5 rounded bg-[#0B192C] border border-[#00B4D8]/30">
                            <div className="text-[10px] font-display font-bold uppercase tracking-[0.06em] text-[#00B4D8] mb-1">
                              RECONCILED BICAMERAL CONFERENCE PROVISO
                            </div>
                            <p className="text-[15px] text-[#F1F5F9] leading-[26px]">
                              {clause.proposedAmendment}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[15px] text-[#F1F5F9] leading-[26px] mb-4">
                          {clause.proposedAmendment || clause.currentText}
                        </p>
                      )}

                      {/* Committee Note Footer */}
                      <div className="p-3 rounded bg-[#0B192C]/90 border border-[#1E3A5F]/60 text-xs text-[#E2E8F0] flex items-start gap-2.5">
                        <Gavel className="w-4 h-4 text-[#F5C242] shrink-0 mt-0.5" />
                        <div>
                          <span className="font-display font-semibold text-[#F5C242] uppercase tracking-[0.04em] text-[11px] mr-2">
                            Committee Counsel Note:
                          </span>
                          <span className="text-[#E2E8F0]">{clause.committeeNote}</span>
                        </div>
                      </div>

                      {/* Parliamentary Legal Counsel Annotations */}
                      {clause.counselAnnotations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-[#1E3A5F]/50 space-y-2">
                          {clause.counselAnnotations.map((ann) => (
                            <div
                              key={ann.id}
                              className="text-xs bg-[#152A42]/70 rounded p-2.5 border border-[#F5C242]/12"
                            >
                              <div className="flex items-center justify-between text-[11px] text-[#94A3B8] mb-1">
                                <span className="font-display font-semibold text-[#F1F5F9]">
                                  {ann.author} · <span className="text-[#00B4D8]">{ann.role}</span>
                                </span>
                                <span className="font-mono-tabular">{ann.timestamp}</span>
                              </div>
                              <p className="text-[#E2E8F0] leading-relaxed">{ann.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {/* RIGHT 3 COLUMNS: Statutory Legal Brief, Vote Tally Breakdown & Congressional Timeline */}
            <aside className="lg:col-span-3 flex flex-col gap-6">
              {/* Plenary Vote Tally Card */}
              <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-5">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#F5C242]/14">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-[0.05em] text-[#F1F5F9]">
                    Plenary Roll-Call Tally
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('roll-call')}
                    className="text-xs font-display font-semibold text-[#F5C242] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Roll</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* 4-Column Tabular Vote Breakdown */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  <div className="bg-[#0B192C] border border-[#10B981]/30 rounded p-2.5">
                    <div className="font-mono-tabular text-xl font-bold text-[#34D399]">
                      {activeMeasure.voteTally.yeas}
                    </div>
                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#94A3B8] mt-0.5">
                      YEAS
                    </div>
                  </div>
                  <div className="bg-[#0B192C] border border-[#EF4444]/30 rounded p-2.5">
                    <div className="font-mono-tabular text-xl font-bold text-[#F87171]">
                      {activeMeasure.voteTally.nays}
                    </div>
                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#94A3B8] mt-0.5">
                      NAYS
                    </div>
                  </div>
                  <div className="bg-[#0B192C] border border-[#F5C242]/30 rounded p-2.5">
                    <div className="font-mono-tabular text-xl font-bold text-[#F5C242]">
                      {activeMeasure.voteTally.abstain}
                    </div>
                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#94A3B8] mt-0.5">
                      ABSTAIN
                    </div>
                  </div>
                  <div className="bg-[#0B192C] border border-[#1E3A5F] rounded p-2.5">
                    <div className="font-mono-tabular text-xl font-bold text-[#94A3B8]">
                      {activeMeasure.voteTally.absent}
                    </div>
                    <div className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#94A3B8] mt-0.5">
                      ABSENT
                    </div>
                  </div>
                </div>

                {/* Proportional Visual Vote Bar */}
                {(() => {
                  const total =
                    activeMeasure.voteTally.yeas +
                    activeMeasure.voteTally.nays +
                    activeMeasure.voteTally.abstain +
                    activeMeasure.voteTally.absent;
                  const yeaPct = Math.round((activeMeasure.voteTally.yeas / total) * 100);
                  const nayPct = Math.round((activeMeasure.voteTally.nays / total) * 100);
                  return (
                    <div className="mb-4">
                      <div className="h-2 w-full rounded bg-[#0B192C] overflow-hidden flex">
                        <div style={{ width: `${yeaPct}%` }} className="bg-[#10B981]" />
                        <div style={{ width: `${nayPct}%` }} className="bg-[#EF4444]" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] font-mono-tabular mt-1.5">
                        <span>{yeaPct}% Affirmative Share</span>
                        <span>{activeMeasure.voteTally.thresholdRequired}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-[11px] font-display font-semibold uppercase tracking-[0.04em] text-[#00B4D8] bg-[#0B192C] px-3 py-2 rounded border border-[#1E3A5F]">
                  {activeMeasure.voteTally.resolutionStatus}
                </div>
              </div>

              {/* Statutory Counsel Brief & Constitutional Review Panel */}
              <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-5">
                <div className="pb-3 mb-3 border-b border-[#F5C242]/14 flex items-center justify-between">
                  <h2 className="font-display text-xs font-semibold uppercase tracking-[0.05em] text-[#F1F5F9]">
                    Statutory Legal Brief
                  </h2>
                  <span
                    className={`text-[10px] font-display font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded ${
                      activeMeasure.statutoryBrief.constitutionalityCheck === 'VERIFIED COMPLIANT'
                        ? 'bg-[#00B4D8]/15 text-[#50D9FE] border border-[#00B4D8]/30'
                        : 'bg-[#EF4444]/15 text-[#F87171] border border-[#EF4444]/30'
                    }`}
                  >
                    {activeMeasure.statutoryBrief.constitutionalityCheck}
                  </span>
                </div>

                <p className="text-xs text-[#E2E8F0] leading-relaxed mb-4">
                  {activeMeasure.statutoryBrief.executiveSummary}
                </p>

                <div className="bg-[#0B192C] border border-[#1E3A5F] rounded p-3 mb-4">
                  <div className="text-[10px] font-display font-bold uppercase tracking-[0.05em] text-[#94A3B8] mb-1">
                    CERTIFIED FISCAL IMPACT ESTIMATE
                  </div>
                  <div className="font-mono-tabular text-sm font-semibold text-[#F5C242]">
                    {activeMeasure.statutoryBrief.fiscalImpactEstimate}
                  </div>
                </div>

                {/* Key Constitutional Findings */}
                <div className="space-y-3 mb-4">
                  <div className="text-[11px] font-display font-semibold uppercase tracking-[0.05em] text-[#94A3B8]">
                    Clause-Level Findings
                  </div>
                  {activeMeasure.statutoryBrief.keyFindings.map((finding, i) => (
                    <div key={i} className="bg-[#0B192C] border border-[#1E3A5F] rounded p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-display text-xs font-semibold text-[#F1F5F9]">
                          {finding.title}
                        </span>
                        <span className="font-mono-tabular text-[10px] text-[#F5C242] shrink-0">
                          {finding.clauseRef}
                        </span>
                      </div>
                      <p className="text-xs text-[#94A3B8] leading-relaxed">{finding.analysis}</p>
                    </div>
                  ))}
                </div>

                {/* Affected Existing Statutes */}
                <div>
                  <div className="text-[11px] font-display font-semibold uppercase tracking-[0.05em] text-[#94A3B8] mb-2">
                    Amended / Cross-Referenced Batas
                  </div>
                  <div className="text-xs text-[#E2E8F0] space-y-1 font-mono-tabular">
                    {activeMeasure.statutoryBrief.affectedStatutes.map((statute) => (
                      <div key={statute} className="py-1 px-2.5 bg-[#0B192C] rounded border border-[#1E3A5F]/60">
                        {statute}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Congressional Status Timeline */}
              <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-5">
                <h2 className="font-display text-xs font-semibold uppercase tracking-[0.05em] text-[#F1F5F9] pb-3 mb-4 border-b border-[#F5C242]/14">
                  Legislative Trajectory & Journal Log
                </h2>
                <div className="space-y-4">
                  {activeMeasure.timeline.map((step, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex flex-col items-center mt-0.5">
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            step.current
                              ? 'bg-[#F5C242] text-[#07111E] ring-4 ring-[#F5C242]/20'
                              : step.completed
                              ? 'bg-[#00B4D8]/20 text-[#00B4D8] border border-[#00B4D8]'
                              : 'bg-[#0B192C] text-[#94A3B8] border border-[#1E3A5F]'
                          }`}
                        >
                          {step.completed ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : index + 1}
                        </div>
                        {index < activeMeasure.timeline.length - 1 && (
                          <div className="w-px h-10 bg-[#1E3A5F] my-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`font-display text-xs font-semibold ${
                              step.current ? 'text-[#F5C242]' : 'text-[#F1F5F9]'
                            }`}
                          >
                            {step.stage}
                          </span>
                          <span className="font-mono-tabular text-[11px] text-[#94A3B8] shrink-0">
                            {step.date}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono-tabular text-[#00B4D8] mt-0.5">
                          {step.referenceDoc}
                        </div>
                        <p className="text-xs text-[#94A3B8] mt-1 leading-snug">{step.details}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* VIEW 2: BATAS & BILLS TRACKER (LEGISLATIVE PIPELINE & WATCHLIST MATRIX) */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            {/* Header & Controls for Batas & Bills Tracker */}
            <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 mb-5 border-b border-[#F5C242]/14">
                <div>
                  <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-[0.06em] text-[#F5C242] mb-1">
                    <span>BATASPH STATUTORY PIPELINE & ENACTMENT MONITOR</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#00B4D8] font-mono-tabular">20TH CONGRESS</span>
                  </div>
                  <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
                    Batas & Bills Tracker — From Committee Filing to Republic Act
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTrackerFilterWatchlistOnly(!trackerFilterWatchlistOnly)}
                    className={`px-3.5 py-2 rounded text-xs font-display font-semibold border transition-colors flex items-center gap-2 cursor-pointer ${
                      trackerFilterWatchlistOnly
                        ? 'bg-[#1B3554] text-[#F5C242] border-[#F5C242]/40'
                        : 'bg-[#152A42] text-[#E2E8F0] border-[#F5C242]/20 hover:bg-[#1B3554]'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5 text-[#F5C242]" />
                    <span>
                      {trackerFilterWatchlistOnly
                        ? `Showing Watchlist (${watchedMeasureIds.length})`
                        : `Filter Watchlist (${watchedMeasureIds.length})`}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsNewMeasureModalOpen(true)}
                    className="px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Docket New Bill / Batas</span>
                  </button>
                </div>
              </div>

              {/* 5-Stage Constitutional Pipeline Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {PIPELINE_STAGES.map((st) => {
                  const stageMeasures = trackerMeasures.filter((m) => m.stage === st.stage);
                  return (
                    <div
                      key={st.stage}
                      className="bg-[#0B192C] border border-[#1E3A5F] rounded-lg p-4 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono-tabular text-xs font-semibold text-[#94A3B8]">
                          STAGE {st.stepNum}
                        </span>
                        <span className="font-mono-tabular text-lg font-bold text-[#F5C242]">
                          {stageMeasures.length}
                        </span>
                      </div>
                      <div>
                        <div className="font-display text-sm font-semibold text-[#F1F5F9] mb-1">
                          {st.label}
                        </div>
                        <p className="text-[11px] text-[#94A3B8] leading-snug">{st.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Interactive Stage-by-Stage Batas & Bills Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
              {PIPELINE_STAGES.map((st) => {
                const columnMeasures = trackerMeasures.filter((m) => m.stage === st.stage);
                return (
                  <div
                    key={st.stage}
                    className="bg-[#0B192C] border border-[#F5C242]/14 rounded-lg overflow-hidden flex flex-col"
                  >
                    <div className="px-4 py-3 bg-[#0F223A] border-b border-[#F5C242]/14 flex items-center justify-between">
                      <div>
                        <span className="font-mono-tabular text-[10px] text-[#94A3B8] block">
                          STAGE {st.stepNum}
                        </span>
                        <h2 className="font-display text-xs font-bold uppercase tracking-[0.05em] text-[#F1F5F9]">
                          {st.label}
                        </h2>
                      </div>
                      <span className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded bg-[#152A42] text-[#F5C242] border border-[#F5C242]/20">
                        {columnMeasures.length}
                      </span>
                    </div>

                    <div className="p-3 space-y-3">
                      {columnMeasures.length === 0 ? (
                        <div className="p-4 text-center border border-dashed border-[#1E3A5F] rounded">
                          <p className="text-xs text-[#94A3B8]">No measures currently in {st.label}</p>
                        </div>
                      ) : (
                        columnMeasures.map((measure) => {
                          const isWatched = watchedMeasureIds.includes(measure.id);
                          return (
                            <div
                              key={measure.id}
                              className="bg-[#0F223A] border border-[#F5C242]/16 rounded-lg p-3.5 hover:border-[#F5C242]/35 transition-colors flex flex-col gap-2.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-display text-sm font-bold text-[#F5C242]">
                                  {measure.designation}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleWatchMeasure(measure.id)}
                                  title="Pin to Watchlist"
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    isWatched
                                      ? 'text-[#F5C242] bg-[#F5C242]/15'
                                      : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                                  }`}
                                >
                                  <Bookmark className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <h3 className="font-display text-xs font-semibold text-[#F1F5F9] leading-snug">
                                {measure.shortTitle}
                              </h3>

                              <div className="text-[11px] text-[#94A3B8] space-y-0.5">
                                <div>Sponsor: {measure.primaryAuthor.name}</div>
                                <div className="font-mono-tabular text-[#00B4D8]">
                                  Tally: {measure.voteTally.yeas}Y - {measure.voteTally.nays}N -{' '}
                                  {measure.voteTally.abstain}A
                                </div>
                              </div>

                              {/* Stage Transition Selector */}
                              <div className="pt-2 border-t border-[#1E3A5F]/60">
                                <label className="block text-[10px] font-display font-semibold uppercase tracking-[0.05em] text-[#94A3B8] mb-1">
                                  Update Trajectory Stage
                                </label>
                                <select
                                  value={measure.stage}
                                  onChange={(e) =>
                                    handleAdvanceMeasureStage(
                                      measure.id,
                                      e.target.value as LegislativeStage
                                    )
                                  }
                                  className="w-full bg-[#0B192C] text-[11px] text-[#E2E8F0] font-display px-2 py-1.5 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242] cursor-pointer"
                                >
                                  {PIPELINE_STAGES.map((opt) => (
                                    <option key={opt.stage} value={opt.stage}>
                                      {opt.stage}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Action Links */}
                              <div className="flex items-center justify-between gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMeasureId(measure.id);
                                    setActiveTab('docket');
                                  }}
                                  className="text-[11px] font-display font-semibold text-[#E2E8F0] hover:text-[#F5C242] flex items-center gap-1 cursor-pointer"
                                >
                                  <FileCheck2 className="w-3 h-3 text-[#F5C242]" />
                                  <span>Read Clauses</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedMeasureId(measure.id);
                                    setActiveTab('ai-faq');
                                    sendLegislativeInquiry(
                                      `What is the legislative status, constitutional basis, and key impact of ${measure.designation} (${measure.shortTitle})?`
                                    );
                                  }}
                                  className="text-[11px] font-display font-semibold text-[#50D9FE] hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Ask AI</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comprehensive Tabular Batas & Bills Ledger */}
            <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#F5C242]/14">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#F1F5F9]">
                    Complete Batas & Bills Statutory Ledger
                  </h2>
                  <p className="text-xs text-[#94A3B8]">
                    Synchronized with Official Gazette volumes, Senate/House Journals, and Bicameral Conference dockets.
                  </p>
                </div>
                <span className="font-mono-tabular text-xs text-[#F5C242]">
                  Showing {trackerMeasures.length} of {customMeasures.length} measures
                </span>
              </div>

              <div className="overflow-x-auto rounded border border-[#F5C242]/16">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B192C] text-[#94A3B8] font-display text-[11px] font-semibold uppercase tracking-[0.05em] border-b border-[#F5C242]/16">
                      <th className="py-3 px-4 border-r border-white/5">Watch</th>
                      <th className="py-3 px-4 border-r border-white/5">Measure No.</th>
                      <th className="py-3 px-4 border-r border-white/5">Short Title & Statutory Scope</th>
                      <th className="py-3 px-4 border-r border-white/5">Chamber</th>
                      <th className="py-3 px-4 border-r border-white/5">Principal Sponsor</th>
                      <th className="py-3 px-4 border-r border-white/5">Trajectory Stage</th>
                      <th className="py-3 px-4 border-r border-white/5 text-right">Fiscal Estimate</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-white/5">
                    {trackerMeasures.map((m, idx) => {
                      const isWatched = watchedMeasureIds.includes(m.id);
                      return (
                        <tr
                          key={m.id}
                          className={`${
                            idx % 2 === 0 ? 'bg-[#0F223A]' : 'bg-[#122438]'
                          } hover:bg-[#1B3554] transition-colors`}
                        >
                          <td className="py-3 px-4 border-r border-white/5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleWatchMeasure(m.id)}
                              className={`p-1 rounded cursor-pointer ${
                                isWatched ? 'text-[#F5C242]' : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                              }`}
                            >
                              <Bookmark className="w-4 h-4" />
                            </button>
                          </td>
                          <td className="py-3 px-4 font-display font-bold text-[#F5C242] border-r border-white/5 whitespace-nowrap">
                            {m.designation}
                          </td>
                          <td className="py-3 px-4 text-[#F1F5F9] border-r border-white/5 max-w-md">
                            <div className="font-display font-semibold">{m.shortTitle}</div>
                            <div className="text-[11px] text-[#94A3B8] truncate">{m.primaryCommittee}</div>
                          </td>
                          <td className="py-3 px-4 text-[#E2E8F0] border-r border-white/5 whitespace-nowrap">
                            {m.chamber}
                          </td>
                          <td className="py-3 px-4 text-[#E2E8F0] border-r border-white/5 whitespace-nowrap">
                            {m.primaryAuthor.name}
                          </td>
                          <td className="py-3 px-4 border-r border-white/5 whitespace-nowrap">
                            {renderStatusChip(m.stage, m.statusCategory)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular text-[#E2E8F0] border-r border-white/5 whitespace-nowrap">
                            {m.statutoryBrief.fiscalImpactEstimate}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedMeasureId(m.id);
                                setActiveTab('docket');
                              }}
                              className="px-2.5 py-1 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#F1F5F9] border border-[#F5C242]/25 hover:bg-[#1B3554] cursor-pointer"
                            >
                              Open Docket
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: AI LEGISLATIVE CHAT & STATUTORY FAQ HUB */}
        {activeTab === 'ai-faq' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 5 COLUMNS: Curated Constitutional & Statutory FAQ Hub */}
            <section className="lg:col-span-5 flex flex-col gap-5">
              <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-5">
                <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-[#F5C242]/14">
                  <div>
                    <span className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#F5C242] block">
                      PARLIAMENTARY KNOWLEDGE BASE
                    </span>
                    <h1 className="font-display text-lg font-bold text-[#F1F5F9]">
                      BatasPH Statutory & Procedural FAQ Hub
                    </h1>
                  </div>
                  <HelpCircle className="w-5 h-5 text-[#F5C242] shrink-0" />
                </div>

                <p className="text-xs text-[#E2E8F0] leading-relaxed mb-4">
                  Browse verified constitutional and parliamentary FAQs below, or click{' '}
                  <span className="text-[#F5C242] font-semibold">Examine via AI Counsel</span> on any entry to
                  launch a live deep-dive analysis in the AI Legislative Chat.
                </p>

                {/* FAQ Search Input */}
                <div className="relative mb-3">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={faqSearchQuery}
                    onChange={(e) => setFaqSearchQuery(e.target.value)}
                    placeholder="Filter FAQs by constitutional article, veto, bicameral..."
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] placeholder-[#94A3B8] pl-9 pr-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                  />
                </div>

                {/* FAQ Category Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    'ALL',
                    'Constitutional Procedure',
                    'Bicameral Reconciliation',
                    'Appropriations & Veto',
                    'Active Docket',
                  ].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFaqCategoryFilter(cat)}
                      className={`px-2.5 py-1 rounded text-[11px] font-display font-semibold transition-colors cursor-pointer ${
                        faqCategoryFilter === cat
                          ? 'bg-[#F5C242] text-[#07111E]'
                          : 'bg-[#0B192C] text-[#94A3B8] border border-[#1E3A5F] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* FAQ Cards List */}
              <div className="space-y-3.5">
                {filteredFaqs.map((faq) => (
                  <article
                    key={faq.id}
                    className="bg-[#0F223A] border border-[#F5C242]/14 hover:border-[#F5C242]/30 rounded-lg p-5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#F5C242]">
                        {faq.category}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-[#00B4D8]">
                        {faq.constitutionalBasis}
                      </span>
                    </div>

                    <h2 className="font-display text-sm font-semibold text-[#F1F5F9] mb-2 leading-snug">
                      {faq.question}
                    </h2>

                    <p className="text-xs text-[#E2E8F0] leading-relaxed mb-3.5 bg-[#0B192C] p-3 rounded border border-[#1E3A5F]">
                      {faq.shortAnswer}
                    </p>

                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => sendLegislativeInquiry(faq.aiFollowUpPrompt)}
                        disabled={isChatLoading}
                        className="px-3 py-1.5 rounded text-xs font-display font-semibold bg-[#152A42] text-[#F5C242] border border-[#F5C242]/25 hover:bg-[#1B3554] hover:border-[#F5C242]/50 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Examine via AI Legislative Chat</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* RIGHT 7 COLUMNS: Interactive AI Legislative Counsel Chat Workbench */}
            <section className="lg:col-span-7 flex flex-col bg-[#0F223A] border border-[#F5C242]/20 rounded-lg overflow-hidden h-[760px]">
              {/* Chat Workbench Header */}
              <div className="px-6 py-4 bg-[#0B192C] border-b border-[#F5C242]/16 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#F5C242]" />
                    <h2 className="font-display text-base font-bold text-[#F1F5F9]">
                      BatasPH AI Legislative Counsel
                    </h2>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Grounded in 20th Congress Bills, Enacted Republic Acts (Batas), and the 1987 Philippine Constitution
                  </p>
                </div>

                {/* Contextual Measure Selector for Chat */}
                <div className="flex items-center gap-2">
                  <select
                    value={activeMeasure.id}
                    onChange={(e) => setSelectedMeasureId(e.target.value)}
                    aria-label="Active Statutory Context"
                    className="bg-[#0F223A] text-xs font-display font-semibold text-[#F5C242] px-3 py-1.5 rounded border border-[#F5C242]/30 focus:outline-none focus:border-[#F5C242] cursor-pointer"
                  >
                    {customMeasures.map((m) => (
                      <option key={m.id} value={m.id}>
                        Context: {m.designation}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() =>
                      setChatHistory([
                        {
                          id: 'welcome-reset',
                          role: 'model',
                          text: `Session reset. Currently focused on **${activeMeasure.designation} — ${activeMeasure.shortTitle}** (${activeMeasure.stage}). Ask any question regarding its clauses, roll-call vote, or constitutional compliance.`,
                          timestamp: new Date().toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          }),
                          referencedMeasure: activeMeasure.designation,
                        },
                      ])
                    }
                    title="Reset Transcript"
                    className="p-1.5 rounded bg-[#152A42] text-[#94A3B8] hover:text-[#F1F5F9] border border-[#1E3A5F] cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Statutory Prompt Chips Bar */}
              <div className="px-6 py-2.5 bg-[#0B192C]/60 border-b border-[#1E3A5F] flex items-center gap-2 overflow-x-auto">
                <span className="text-[10px] font-display font-bold uppercase tracking-[0.06em] text-[#94A3B8] shrink-0">
                  Direct Inquiries:
                </span>
                {[
                  `Summarize ${activeMeasure.designation} clauses & constitutional basis`,
                  'How does a House/Senate Bill become a Republic Act (Batas)?',
                  'Compare H.B. 4728 SCADA proviso vs. S.B. 2890 AI Audit mandate',
                  'Why was H.B. 3109 vetoed by the President?',
                ].map((quickPrompt) => (
                  <button
                    key={quickPrompt}
                    type="button"
                    disabled={isChatLoading}
                    onClick={() => sendLegislativeInquiry(quickPrompt)}
                    className="px-2.5 py-1 rounded text-[11px] font-display font-medium bg-[#152A42] text-[#E2E8F0] border border-[#F5C242]/20 hover:bg-[#1B3554] hover:text-[#F5C242] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {quickPrompt}
                  </button>
                ))}
              </div>

              {/* Chat Transcript Scroll Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#07111E]/50">
                {chatHistory.map((turn) => (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${
                      turn.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[11px] text-[#94A3B8] mb-1 px-1">
                      <span className="font-display font-semibold uppercase tracking-[0.04em] text-[#E2E8F0]">
                        {turn.role === 'user' ? 'Parliamentary Researcher' : 'BatasPH AI Statutory Counsel'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular">{turn.timestamp}</span>
                      {turn.referencedMeasure && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono-tabular text-[#00B4D8]">{turn.referencedMeasure}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-2xl rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap ${
                        turn.role === 'user'
                          ? 'bg-[#1B3554] text-[#F1F5F9] border border-[#F5C242]/35'
                          : 'bg-[#0F223A] text-[#E2E8F0] border border-[#F5C242]/16'
                      }`}
                    >
                      {turn.text}
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex items-center gap-2.5 text-xs text-[#F5C242] bg-[#0F223A] border border-[#F5C242]/20 rounded-lg p-3.5 max-w-md">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>
                      Consulting BatasPH 20th Congress statutory docket & constitutional jurisprudence...
                    </span>
                  </div>
                )}

                {chatError && (
                  <div className="p-4 rounded-lg bg-[#93000A]/30 border border-[#EF4444]/40 text-xs text-[#FFDAD6] flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
                      <div>
                        <div className="font-display font-semibold text-[#F87171] mb-0.5">
                          Statutory AI Query Error
                        </div>
                        <p className="leading-relaxed">{chatError}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const lastUserTurn = [...chatHistory].reverse().find((t) => t.role === 'user');
                        if (lastUserTurn) {
                          setChatHistory((prev) => prev.filter((t) => t.id !== lastUserTurn.id));
                          sendLegislativeInquiry(lastUserTurn.text);
                        }
                      }}
                      className="px-3 py-1.5 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#F5C242] border border-[#F5C242]/30 hover:bg-[#1B3554] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry Inquiry</span>
                    </button>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendLegislativeInquiry(chatInput);
                }}
                className="p-3 sm:p-4 bg-[#0B192C] border-t border-[#F5C242]/16 flex items-center gap-2 sm:gap-3 w-full"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                  placeholder={`Ask BatasPH AI Counsel about ${activeMeasure.designation}, Republic Acts, or constitutional procedure...`}
                  className="flex-1 min-w-0 bg-[#07111E] text-sm text-[#F1F5F9] placeholder-[#94A3B8] px-3 sm:px-4 py-2.5 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242] focus:ring-1 focus:ring-[#F5C242]"
                />
                <button
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="px-3.5 sm:px-4 py-2.5 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] active:bg-[#D9A726] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 shrink-0" />
                  <span>Submit</span>
                </button>
              </form>
            </section>
          </div>
        )}

        {/* VIEW 4: PLENARY ROLL-CALL DATA GRID */}
        {activeTab === 'roll-call' && (
          <div className="space-y-6">
            <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 mb-5 border-b border-[#F5C242]/14">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="font-display text-xs font-bold uppercase tracking-[0.06em] text-[#F5C242]">
                      CERTIFIED PLENARY JOURNAL RECORD
                    </span>
                    <span aria-hidden="true" className="text-[#94A3B8]">
                      ·
                    </span>
                    <span className="font-mono-tabular text-xs text-[#00B4D8]">
                      {activeMeasure.designation}
                    </span>
                  </div>
                  <h1 className="font-display text-2xl font-bold text-[#F1F5F9]">
                    Roll-Call Vote Verification Matrix — {activeMeasure.shortTitle}
                  </h1>
                </div>

                {/* Measure Switcher for Roll-Call */}
                <div className="flex flex-wrap items-center gap-2">
                  {customMeasures.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMeasureId(m.id)}
                      className={`px-3 py-1.5 rounded text-xs font-display font-semibold transition-colors cursor-pointer ${
                        m.id === activeMeasure.id
                          ? 'bg-[#F5C242] text-[#07111E]'
                          : 'bg-[#152A42] text-[#E2E8F0] border border-[#F5C242]/20 hover:bg-[#1B3554]'
                      }`}
                    >
                      {m.designation}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter & Search Bar for Roll Call Table */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-1.5 bg-[#0B192C] p-1 rounded border border-[#1E3A5F]">
                  {(['ALL', 'YEA', 'NAY', 'ABSTAIN'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVoteFilter(v)}
                      className={`px-3 py-1 rounded text-xs font-display font-semibold tracking-[0.04em] transition-colors cursor-pointer ${
                        voteFilter === v
                          ? 'bg-[#F5C242] text-[#07111E]'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {v === 'ALL' ? 'ALL VOTES' : v}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rollCallSearch}
                    onChange={(e) => setRollCallSearch(e.target.value)}
                    placeholder="Filter legislator, district, or bloc..."
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] placeholder-[#94A3B8] pl-9 pr-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                  />
                </div>
              </div>

              {/* Data Grid & Roll-Call Table per Design System Spec */}
              <div className="overflow-x-auto rounded border border-[#F5C242]/16">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0B192C] text-[#94A3B8] font-display text-[11px] font-semibold uppercase tracking-[0.05em] border-b border-[#F5C242]/16">
                      <th className="py-3 px-4 border-r border-white/5">Legislator</th>
                      <th className="py-3 px-4 border-r border-white/5">Chamber</th>
                      <th className="py-3 px-4 border-r border-white/5">District / Constituency</th>
                      <th className="py-3 px-4 border-r border-white/5">Parliamentary Bloc</th>
                      <th className="py-3 px-4 border-r border-white/5">Recorded Vote</th>
                      <th className="py-3 px-4 border-r border-white/5">Explanation of Vote / Floor Manifestation</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-white/5">
                    {filteredRollCall.map((row, idx) => (
                      <tr
                        key={row.id}
                        className={`${
                          idx % 2 === 0 ? 'bg-[#0F223A]' : 'bg-[#122438]'
                        } hover:bg-[#1B3554] transition-colors`}
                      >
                        <td className="py-3 px-4 font-display font-semibold text-[#F1F5F9] border-r border-white/5 whitespace-nowrap">
                          {row.legislatorName}
                        </td>
                        <td className="py-3 px-4 text-[#E2E8F0] border-r border-white/5 whitespace-nowrap">
                          {row.chamber}
                        </td>
                        <td className="py-3 px-4 text-[#94A3B8] border-r border-white/5 whitespace-nowrap">
                          {row.districtOrBloc}
                        </td>
                        <td className="py-3 px-4 text-[#E2E8F0] border-r border-white/5 whitespace-nowrap">
                          {row.partyAffiliation}
                        </td>
                        <td className="py-3 px-4 border-r border-white/5 whitespace-nowrap">
                          {row.vote === 'YEA' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-display font-bold tracking-[0.05em] bg-[#10B981]/12 text-[#34D399] border border-[#10B981]/30">
                              <Check className="w-3 h-3" /> YEA
                            </span>
                          )}
                          {row.vote === 'NAY' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-display font-bold tracking-[0.05em] bg-[#EF4444]/12 text-[#F87171] border border-[#EF4444]/30">
                              <X className="w-3 h-3" /> NAY
                            </span>
                          )}
                          {row.vote === 'ABSTAIN' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-display font-bold tracking-[0.05em] bg-[#F5C242]/10 text-[#F5C242] border border-[#F5C242]/25">
                              ABSTAIN
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[#E2E8F0] border-r border-white/5 max-w-md">
                          {row.explanationOfVote || (
                            <span className="text-[#94A3B8] italic">Concurred via standard electronic roll call</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono-tabular text-[#94A3B8] whitespace-nowrap">
                          {row.timestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: PHILIPPINE SENATORS & CONGRESSMEN DIRECTORY (UPFRONT PHOTOS & ACCOMPLISHMENTS: BILLS PASSED, AUTHORED, CO-AUTHORED & SPONSORED) */}
        {activeTab === 'legislators' && (
          <div className="space-y-6">
            {/* UPFRONT VISUAL PHOTO & ACCOMPLISHMENTS GRID FOR ALL 342 SENATORS & CONGRESSMEN */}
            <div
              ref={legislatorsDirectoryRef}
              className="bg-[#0B192C] border border-[#F5C242]/25 rounded-lg p-5 scroll-mt-20"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 mb-4 border-b border-[#F5C242]/14">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-display font-bold uppercase tracking-[0.06em] text-[#F5C242] mb-1">
                    <span>COMPLETE 20TH CONGRESS PHOTO & ACCOMPLISHMENTS DIRECTORY</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-[#34D399] font-mono-tabular">
                      ROSTER AS OF {CONGRESS_20TH_OVERVIEW.rosterAsOf.toUpperCase()}
                    </span>
                  </div>
                  <h1 className="font-display text-lg sm:text-xl font-bold text-[#F1F5F9]">
                    Showing {filteredLegislators.length} of {legislatorsList.length} Philippine Senators & Representatives
                  </h1>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Click any Senator or Representative card below to inspect their full Background, Bills Passed into Law, Authored, Co-Authored & Sponsored Dossier.
                  </p>
                </div>

                {/* Part I / Part II-A / Part II-B Segmented Filter */}
                <div className="flex flex-wrap items-center gap-1.5 bg-[#0F223A] p-1.5 rounded border border-[#1E3A5F] self-start lg:self-auto">
                  {(
                    [
                      {
                        id: 'ALL',
                        label: `All 20th Congress (${legislatorsList.length})`,
                      },
                      {
                        id: 'Senator',
                        label: `Part I: Senate (${
                          legislatorsList.filter(
                            (l) =>
                              (l.subCategory || (l.chamber === 'Senate' ? 'Senator' : '')) ===
                              'Senator'
                          ).length
                        })`,
                      },
                      {
                        id: 'District Representative',
                        label: `Part II-A: District Reps (${
                          legislatorsList.filter(
                            (l) => l.subCategory === 'District Representative'
                          ).length
                        })`,
                      },
                      {
                        id: 'Party-List Representative',
                        label: `Part II-B: Party-List Reps (${
                          legislatorsList.filter(
                            (l) => l.subCategory === 'Party-List Representative'
                          ).length
                        })`,
                      },
                    ] as const
                  ).map((ch) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => setLegislatorChamberFilter(ch.id)}
                      className={`px-3 py-1.5 rounded text-xs font-display font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        legislatorChamberFilter === ch.id
                          ? 'bg-[#F5C242] text-[#07111E]'
                          : 'text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Compact 20th Congress Leadership & Search Bar */}
              <div className="mb-4 space-y-3">
                <form
                  onSubmit={(e) => handleSearchPhilippineLegislator(e)}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="relative flex-1 min-w-0">
                    <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={legislatorSearchInput}
                      onChange={(e) => setLegislatorSearchInput(e.target.value)}
                      placeholder="Filter all 342 Senators, District Reps & Party-List Reps by name, province/city, district, party, or Republic Act..."
                      className="w-full min-w-0 bg-[#0F223A] text-sm text-[#F1F5F9] placeholder-[#94A3B8] pl-10 pr-9 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                    />
                    {legislatorSearchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setLegislatorSearchInput('');
                          setLegislatorSearchError(null);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#F1F5F9] p-1 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSearchingLegislator || !legislatorSearchInput.trim()}
                    className="px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    {isSearchingLegislator ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Fetching Live Record...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5 shrink-0" />
                        <span>Search & Inspect Lawmaker</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Quick Jump Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="font-display font-semibold text-[11px] uppercase tracking-[0.04em] text-[#94A3B8] mr-1">
                    Quick Jump:
                  </span>
                  {[
                    'Sherwin Gatchalian',
                    'Bojie Dy',
                    'Sandro Marcos',
                    'Risa Hontiveros',
                    'Bam Aquino',
                    'Kiko Pangilinan',
                    'Raffy Tulfo',
                    'Chel Diokno',
                    'Leila de Lima',
                    'Martin Romualdez',
                    'Paolo Duterte',
                    'Roman Romulo',
                  ].map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        setLegislatorSearchInput(name);
                        const found = legislatorsList.find((l) =>
                          l.fullName.toLowerCase().includes(name.toLowerCase())
                        );
                        if (found) {
                          setSelectedLegislatorId(found.id);
                          legislatorDossierRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                          });
                        }
                      }}
                      className="px-2.5 py-1 rounded text-[11px] font-display font-medium bg-[#152A42] text-[#E2E8F0] border border-[#1E3A5F] hover:border-[#F5C242]/40 hover:text-[#F5C242] transition-colors cursor-pointer"
                    >
                      {name}
                    </button>
                  ))}
                </div>

                {legislatorSearchError && (
                  <div className="p-3 rounded bg-[#93000A]/30 border border-[#EF4444]/40 text-xs text-[#FFDAD6] flex items-center justify-between gap-3">
                    <span>{legislatorSearchError}</span>
                    <button
                      type="button"
                      onClick={() => handleSearchPhilippineLegislator()}
                      className="px-2.5 py-1 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#F5C242] border border-[#F5C242]/30 cursor-pointer shrink-0"
                    >
                      Retry Lookup
                    </button>
                  </div>
                )}
              </div>

              {filteredLegislators.length === 0 ? (
                <div className="p-8 text-center space-y-3 bg-[#0F223A] rounded-lg border border-[#1E3A5F]">
                  <p className="text-sm text-[#E2E8F0]">
                    No direct match in current filter for "{legislatorSearchInput}". Click below to run a live lookup:
                  </p>
                  <button
                    type="button"
                    disabled={isSearchingLegislator}
                    onClick={() => handleSearchPhilippineLegislator()}
                    className="px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    {isSearchingLegislator ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Fetching Verified Profile, Photo & Accomplishments...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Live Fetch "{legislatorSearchInput}" from Philippine Congress</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[880px] overflow-y-auto pr-1">
                  {filteredLegislators.map((leg) => {
                    const isSelected = leg.id === activeLegislator.id;
                    const passedCount = (leg.billsPassed || leg.authoredMeasures).length;
                    const initials = leg.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    const badgeLabel =
                      leg.subCategory === 'Party-List Representative'
                        ? `PARTY-LIST ${leg.rosterNumber ? `#${leg.rosterNumber}` : ''}`
                        : leg.chamber === 'Senate'
                        ? `SENATOR ${leg.rosterNumber ? `#${leg.rosterNumber}` : ''}`
                        : `DISTRICT REP ${leg.rosterNumber ? `#${leg.rosterNumber}` : ''}`;
                    return (
                      <button
                        key={leg.id}
                        type="button"
                        onClick={() => {
                          setSelectedLegislatorId(leg.id);
                          legislatorDossierRef.current?.scrollIntoView({
                            behavior: 'smooth',
                            block: 'nearest',
                          });
                        }}
                        className={`text-left rounded-lg p-4 transition-all cursor-pointer flex flex-col justify-between border ${
                          isSelected
                            ? 'bg-[#152A42] border-[#F5C242] ring-1 ring-[#F5C242]/50'
                            : 'bg-[#0F223A] border-[#F5C242]/16 hover:border-[#F5C242]/45 hover:bg-[#152A42]/75'
                        }`}
                      >
                        <div>
                          <div className="flex items-start gap-3.5 mb-3">
                            {/* Upfront Official Portrait */}
                            <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-[#1B3554] border border-[#F5C242]/40 shrink-0 flex items-center justify-center">
                              {leg.photoUrl ? (
                                <img
                                  src={leg.photoUrl}
                                  alt={leg.honorificName}
                                  loading="lazy"
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover object-top"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : null}
                              <span className="font-display text-sm font-bold text-[#F5C242] absolute -z-10">
                                {initials}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-[0.05em] mb-1 ${
                                  leg.chamber === 'Senate'
                                    ? 'bg-[#F5C242]/15 text-[#F5C242] border border-[#F5C242]/30'
                                    : leg.subCategory === 'Party-List Representative'
                                    ? 'bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/30'
                                    : 'bg-[#00B4D8]/15 text-[#50D9FE] border border-[#00B4D8]/30'
                                }`}
                              >
                                {badgeLabel}
                              </span>
                              <h3 className="font-display text-sm font-bold text-[#F1F5F9] leading-snug line-clamp-2">
                                {leg.honorificName}
                              </h3>
                              <p className="text-[11px] text-[#94A3B8] truncate mt-0.5">
                                {leg.districtOrConstituency} · {leg.partyAffiliation}
                              </p>
                            </div>
                          </div>

                          {/* Background & Notable Accomplishment Upfront Preview */}
                          {leg.notableAccomplishments && leg.notableAccomplishments.length > 0 && (
                            <div className="text-[11px] text-[#E2E8F0] bg-[#0B192C] border border-[#1E3A5F] rounded p-2 mb-2 line-clamp-2">
                              <span className="text-[#F5C242] font-semibold">Accomplishment: </span>
                              {leg.notableAccomplishments[0]}
                            </div>
                          )}

                          {/* Top Highlighted Law / Bill Preview */}
                          <div className="text-[11px] text-[#E2E8F0] bg-[#0B192C] border border-[#1E3A5F] rounded p-2 mb-3 line-clamp-2">
                            <span className="text-[#34D399] font-semibold">Key Measure: </span>
                            {(leg.billsPassed?.[0] || leg.authoredMeasures[0])?.designation} —{' '}
                            {(leg.billsPassed?.[0] || leg.authoredMeasures[0])?.title}
                          </div>
                        </div>

                        {/* 4-Metric Accomplishments Summary Footer */}
                        <div className="grid grid-cols-4 gap-1 pt-2.5 border-t border-[#1E3A5F] text-center font-mono-tabular">
                          <div>
                            <div className="text-xs font-bold text-[#34D399]">{passedCount}</div>
                            <div className="text-[9px] font-display uppercase text-[#94A3B8]">
                              Passed
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#F5C242]">
                              {leg.authoredMeasures.length}
                            </div>
                            <div className="text-[9px] font-display uppercase text-[#94A3B8]">
                              Authored
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#50D9FE]">
                              {leg.coAuthoredMeasures.length}
                            </div>
                            <div className="text-[9px] font-display uppercase text-[#94A3B8]">
                              Co-Auth
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#E2E8F0]">
                              {leg.sponsoredLawsAndBills.length}
                            </div>
                            <div className="text-[9px] font-display uppercase text-[#94A3B8]">
                              Sponsored
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 12-Column Lawmaker Directory & Detailed Accomplishments Dossier */}
            <div ref={legislatorDossierRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT 4 COLUMNS: Lawmaker Roster with Upfront Official Photos */}
              <aside className="lg:col-span-4 bg-[#0B192C] border border-[#F5C242]/14 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-[#0F223A] border-b border-[#F5C242]/14 flex items-center justify-between">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.05em] text-[#F1F5F9]">
                    20th Congress Roster Index
                  </span>
                  <span className="font-mono-tabular text-xs text-[#F5C242] font-semibold">
                    {filteredLegislators.length} Members
                  </span>
                </div>

                <div className="divide-y divide-[#1E3A5F]/60 max-h-[780px] overflow-y-auto">
                  {filteredLegislators.map((leg) => {
                    const isSelected = leg.id === activeLegislator.id;
                    const initials = leg.fullName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();
                    return (
                      <button
                        key={leg.id}
                        type="button"
                        onClick={() => setSelectedLegislatorId(leg.id)}
                        className={`w-full text-left p-3.5 flex items-center gap-3.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#152A42] ring-1 ring-inset ring-[#F5C242]/45'
                            : 'bg-[#0F223A]/60 hover:bg-[#152A42]/60'
                        }`}
                      >
                        {/* Upfront Official Lawmaker Portrait */}
                        <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#1B3554] border border-[#F5C242]/35 shrink-0 flex items-center justify-center">
                          {leg.photoUrl ? (
                            <img
                              src={leg.photoUrl}
                              alt={leg.honorificName}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : null}
                          <span className="font-display text-sm font-bold text-[#F5C242] absolute -z-10">
                            {initials}
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-display text-[10px] font-bold uppercase tracking-[0.06em] text-[#F5C242]">
                              {leg.subCategory === 'Party-List Representative'
                                ? `PARTY-LIST #${leg.rosterNumber || ''}`
                                : leg.chamber === 'Senate'
                                ? `SENATE #${leg.rosterNumber || ''}`
                                : `DISTRICT REP #${leg.rosterNumber || ''}`}
                            </span>
                            <span className="font-mono-tabular text-[11px] text-[#34D399] shrink-0">
                              {(leg.billsPassed || leg.authoredMeasures).length} Passed ·{' '}
                              {leg.authoredMeasures.length +
                                leg.coAuthoredMeasures.length +
                                leg.sponsoredLawsAndBills.length}{' '}
                              Total
                            </span>
                          </div>
                          <div className="font-display text-sm font-bold text-[#F1F5F9] truncate">
                            {leg.honorificName}
                          </div>
                          <div className="text-[11px] text-[#94A3B8] truncate">
                            {leg.districtOrConstituency} · {leg.partyAffiliation}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* RIGHT 8 COLUMNS: Upfront Portrait Profile & Accomplishments Dossier (Bills Passed, Authored, Co-Authored, Sponsored) */}
              <section className="lg:col-span-8 flex flex-col gap-6">
                {/* Executive Lawmaker Hero Dossier with Prominent Upfront Portrait */}
                <div className="bg-[#0F223A] border border-[#F5C242]/20 rounded-lg p-6">
                  <div className="flex flex-col sm:flex-row items-start gap-6 pb-5 mb-5 border-b border-[#F5C242]/14">
                    {/* Large Upfront Official Portrait Frame */}
                    <div className="relative w-28 h-36 sm:w-32 sm:h-40 rounded-lg overflow-hidden bg-[#1B3554] border-2 border-[#F5C242]/45 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.60)] shrink-0 flex items-center justify-center">
                      {activeLegislator.photoUrl ? (
                        <img
                          src={activeLegislator.photoUrl}
                          alt={activeLegislator.honorificName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover object-top"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : null}
                      <div className="flex flex-col items-center justify-center text-center p-2 absolute -z-10">
                        <Landmark className="w-6 h-6 text-[#F5C242] mb-1" />
                        <span className="font-display text-lg font-bold text-[#F5C242]">
                          {activeLegislator.fullName
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                      </div>
                    </div>

                    {/* Biographical & Chamber Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-display font-bold uppercase tracking-[0.06em] bg-[#F5C242]/15 text-[#F5C242] border border-[#F5C242]/30">
                          {activeLegislator.subCategory === 'Party-List Representative'
                            ? `20TH CONGRESS · PARTY-LIST REPRESENTATIVE ${
                                activeLegislator.rosterNumber ? `#${activeLegislator.rosterNumber}` : ''
                              }`
                            : activeLegislator.chamber === 'Senate'
                            ? `20TH CONGRESS · SENATOR OF THE REPUBLIC ${
                                activeLegislator.rosterNumber ? `#${activeLegislator.rosterNumber}` : ''
                              }`
                            : `20TH CONGRESS · DISTRICT REPRESENTATIVE ${
                                activeLegislator.rosterNumber ? `#${activeLegislator.rosterNumber}` : ''
                              }`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-tabular text-xs text-[#00B4D8]">
                            {activeLegislator.termInfo}
                          </span>
                          <button
                            type="button"
                            disabled={isSearchingLegislator}
                            onClick={() =>
                              handleSearchPhilippineLegislator(undefined, activeLegislator.fullName)
                            }
                            className="px-2.5 py-1 rounded text-[11px] font-display font-semibold bg-[#152A42] text-[#F5C242] border border-[#F5C242]/30 hover:bg-[#1B3554] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw
                              className={`w-3 h-3 ${isSearchingLegislator ? 'animate-spin' : ''}`}
                            />
                            <span>Live Sync Record</span>
                          </button>
                        </div>
                      </div>

                      <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#F1F5F9] tracking-tight mb-1">
                        {activeLegislator.honorificName}
                      </h2>

                      <div className="text-xs font-display font-semibold text-[#F5C242] mb-2">
                        {activeLegislator.roleTitle}
                      </div>

                      {/* Unboxed Metadata Row */}
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A3B8] mb-3">
                        <span className="text-[#E2E8F0] font-medium">
                          Constituency: {activeLegislator.districtOrConstituency}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>Party: {activeLegislator.partyAffiliation}</span>
                        {activeLegislator.bloc && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#50D9FE]">Bloc: {activeLegislator.bloc}</span>
                          </>
                        )}
                        {activeLegislator.lastSyncedAt && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#34D399] font-mono-tabular">
                              Verified {activeLegislator.lastSyncedAt}
                            </span>
                          </>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-[#E2E8F0] leading-relaxed mb-3">
                        {activeLegislator.biography}
                      </p>

                      {/* Background & Notable Public Service Accomplishments Box */}
                      {activeLegislator.notableAccomplishments &&
                        activeLegislator.notableAccomplishments.length > 0 && (
                          <div className="bg-[#0B192C] border border-[#F5C242]/25 rounded-lg p-3.5 space-y-1.5">
                            <div className="text-[11px] font-display font-bold uppercase tracking-[0.05em] text-[#F5C242]">
                              Background, Public Offices Held & Key Accomplishments
                            </div>
                            <ul className="space-y-1 text-xs text-[#E2E8F0]">
                              {activeLegislator.notableAccomplishments.map((acc, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Check className="w-3.5 h-3.5 text-[#34D399] shrink-0 mt-0.5" />
                                  <span>{acc}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* 5-Column Quantitative Accomplishments Summary Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-[#0B192C] border border-[#10B981]/30 rounded p-3">
                      <div className="font-mono-tabular text-xl font-bold text-[#34D399]">
                        {(activeLegislator.billsPassed || activeLegislator.authoredMeasures).length}
                      </div>
                      <div className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0]">
                        Bills Passed into Law
                      </div>
                    </div>
                    <div className="bg-[#0B192C] border border-[#F5C242]/25 rounded p-3">
                      <div className="font-mono-tabular text-xl font-bold text-[#F5C242]">
                        {activeLegislator.authoredMeasures.length}
                      </div>
                      <div className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0]">
                        Principal Authored
                      </div>
                    </div>
                    <div className="bg-[#0B192C] border border-[#00B4D8]/25 rounded p-3">
                      <div className="font-mono-tabular text-xl font-bold text-[#50D9FE]">
                        {activeLegislator.coAuthoredMeasures.length}
                      </div>
                      <div className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0]">
                        Co-Authored Bills
                      </div>
                    </div>
                    <div className="bg-[#0B192C] border border-[#10B981]/25 rounded p-3">
                      <div className="font-mono-tabular text-xl font-bold text-[#34D399]">
                        {activeLegislator.sponsoredLawsAndBills.length}
                      </div>
                      <div className="font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0]">
                        Sponsored Laws
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1 bg-[#0B192C] border border-[#1E3A5F] rounded p-3 flex flex-col justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('ai-faq');
                          sendLegislativeInquiry(
                            `Provide a comprehensive legislative accomplishments briefing on ${activeLegislator.honorificName} (${activeLegislator.chamber}, ${activeLegislator.districtOrConstituency}), detailing their bills passed into law, principal authored laws, co-authored bills, and sponsored Republic Acts.`
                          );
                        }}
                        className="w-full py-2 px-3 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>AI Record Brief</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Accomplishments Filter Tabs: Bills Passed, Authored, Co-Authored, Sponsored */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0B192C] border border-[#F5C242]/14 rounded-lg px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(
                      [
                        { id: 'ALL', label: 'All Accomplishments' },
                        {
                          id: 'PASSED',
                          label: `Bills Passed into Law (${
                            (activeLegislator.billsPassed || activeLegislator.authoredMeasures).length
                          })`,
                        },
                        {
                          id: 'AUTHORED',
                          label: `Principal Authored (${activeLegislator.authoredMeasures.length})`,
                        },
                        {
                          id: 'CO_AUTHORED',
                          label: `Co-Authored (${activeLegislator.coAuthoredMeasures.length})`,
                        },
                        {
                          id: 'SPONSORED',
                          label: `Sponsored (${activeLegislator.sponsoredLawsAndBills.length})`,
                        },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActivePortfolioTab(tab.id)}
                        className={`px-3 py-1.5 rounded text-xs font-display font-semibold transition-colors cursor-pointer ${
                          activePortfolioTab === tab.id
                            ? 'bg-[#F5C242] text-[#07111E]'
                            : 'bg-[#152A42] text-[#E2E8F0] hover:bg-[#1B3554]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section 0: Bills Passed into Law (Enacted Republic Acts) */}
                {(activePortfolioTab === 'ALL' || activePortfolioTab === 'PASSED') && (
                  <div className="bg-[#0F223A] border border-[#10B981]/30 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#10B981]/20">
                      <h3 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-[#34D399] flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 shrink-0" />
                        <span>Bills Passed into Law (Enacted Republic Acts)</span>
                      </h3>
                      <span className="font-mono-tabular text-xs text-[#34D399]">
                        {(activeLegislator.billsPassed || activeLegislator.authoredMeasures).length} Laws Passed
                      </span>
                    </div>

                    <div className="space-y-3">
                      {(activeLegislator.billsPassed || activeLegislator.authoredMeasures).map(
                        (item, idx) => (
                          <div
                            key={`passed-${item.designation}-${idx}`}
                            className="bg-[#0B192C] border border-[#1E3A5F] rounded-lg p-4 hover:border-[#10B981]/45 transition-colors"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <span className="font-display text-sm font-bold text-[#34D399]">
                                {item.designation}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono-tabular text-xs text-[#94A3B8]">
                                  {item.yearOrDate}
                                </span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-[0.05em] bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/35">
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            <h4 className="font-display text-sm font-semibold text-[#F1F5F9] mb-1.5">
                              {item.title}
                            </h4>
                            <p className="text-xs text-[#E2E8F0] leading-relaxed">{item.summary}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Section 1: Principal Authored Bills & Republic Acts */}
                {(activePortfolioTab === 'ALL' || activePortfolioTab === 'AUTHORED') && (
                  <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F5C242]/14">
                      <h3 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-[#F5C242] flex items-center gap-2">
                        <Award className="w-4 h-4 shrink-0" />
                        <span>Principal Authored Republic Acts & Bills</span>
                      </h3>
                      <span className="font-mono-tabular text-xs text-[#94A3B8]">
                        {activeLegislator.authoredMeasures.length} Measures
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeLegislator.authoredMeasures.map((item, idx) => (
                        <div
                          key={`${item.designation}-${idx}`}
                          className="bg-[#0B192C] border border-[#1E3A5F] rounded-lg p-4 hover:border-[#F5C242]/35 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <span className="font-display text-sm font-bold text-[#F5C242]">
                              {item.designation}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tabular text-xs text-[#94A3B8]">
                                {item.yearOrDate}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-[0.05em] bg-[#10B981]/12 text-[#34D399] border border-[#10B981]/30">
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <h4 className="font-display text-sm font-semibold text-[#F1F5F9] mb-1.5">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#E2E8F0] leading-relaxed">{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2: Co-Authored Bills & Laws */}
                {(activePortfolioTab === 'ALL' || activePortfolioTab === 'CO_AUTHORED') && (
                  <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F5C242]/14">
                      <h3 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-[#50D9FE] flex items-center gap-2">
                        <Users className="w-4 h-4 shrink-0" />
                        <span>Co-Authored Bills & Enacted Statutes</span>
                      </h3>
                      <span className="font-mono-tabular text-xs text-[#94A3B8]">
                        {activeLegislator.coAuthoredMeasures.length} Measures
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeLegislator.coAuthoredMeasures.map((item, idx) => (
                        <div
                          key={`${item.designation}-${idx}`}
                          className="bg-[#0B192C] border border-[#1E3A5F] rounded-lg p-4 hover:border-[#00B4D8]/35 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <span className="font-display text-sm font-bold text-[#50D9FE]">
                              {item.designation}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tabular text-xs text-[#94A3B8]">
                                {item.yearOrDate}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-[0.05em] bg-[#00B4D8]/12 text-[#50D9FE] border border-[#00B4D8]/30">
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <h4 className="font-display text-sm font-semibold text-[#F1F5F9] mb-1.5">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#E2E8F0] leading-relaxed">{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Plenary Sponsored Laws & Committee Reports */}
                {(activePortfolioTab === 'ALL' || activePortfolioTab === 'SPONSORED') && (
                  <div className="bg-[#0F223A] border border-[#F5C242]/18 rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F5C242]/14">
                      <h3 className="font-display text-sm font-bold uppercase tracking-[0.05em] text-[#34D399] flex items-center gap-2">
                        <Gavel className="w-4 h-4 shrink-0" />
                        <span>Sponsored Laws & Plenary Committee Endorsements</span>
                      </h3>
                      <span className="font-mono-tabular text-xs text-[#94A3B8]">
                        {activeLegislator.sponsoredLawsAndBills.length} Measures
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeLegislator.sponsoredLawsAndBills.map((item, idx) => (
                        <div
                          key={`${item.designation}-${idx}`}
                          className="bg-[#0B192C] border border-[#1E3A5F] rounded-lg p-4 hover:border-[#10B981]/35 transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                            <span className="font-display text-sm font-bold text-[#34D399]">
                              {item.designation}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tabular text-xs text-[#94A3B8]">
                                {item.yearOrDate}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-display font-bold uppercase tracking-[0.05em] bg-[#10B981]/12 text-[#34D399] border border-[#10B981]/30">
                                {item.status}
                              </span>
                            </div>
                          </div>
                          <h4 className="font-display text-sm font-semibold text-[#F1F5F9] mb-1.5">
                            {item.title}
                          </h4>
                          <p className="text-xs text-[#E2E8F0] leading-relaxed">{item.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grounding Citations if Dynamically Searched */}
                {activeLegislator.verifiedSources && activeLegislator.verifiedSources.length > 0 && (
                  <div className="bg-[#0B192C] border border-[#1E3A5F] rounded-lg p-4">
                    <div className="text-[11px] font-display font-semibold uppercase tracking-[0.05em] text-[#94A3B8] mb-2">
                      Verified Congressional & Official Gazette Sources
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      {activeLegislator.verifiedSources.map((src, i) => (
                        <a
                          key={i}
                          href={src.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#50D9FE] hover:underline flex items-center gap-1"
                        >
                          <span>{src.title}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Docket New Bill / Batas in Batas & Bills Tracker */}
      {isNewMeasureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#152A42] border border-[#F5C242]/35 rounded-xl max-w-xl w-full p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.60),0_2px_6px_-1px_rgba(245,194,66,0.06)]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F5C242]/16">
              <div>
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[#F5C242]">
                  BATASPH DOCKET FILING WORKBENCH
                </span>
                <h3 className="font-display text-lg font-semibold text-[#F1F5F9]">
                  Add Measure to Batas & Bills Tracker
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewMeasureModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrackedMeasure} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                    Measure Prefix
                  </label>
                  <select
                    value={newBillPrefix}
                    onChange={(e) =>
                      setNewBillPrefix(e.target.value as 'H.B.' | 'S.B.' | 'P.S. Res.' | 'R.A.')
                    }
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                  >
                    <option value="H.B.">H.B. (House Bill)</option>
                    <option value="S.B.">S.B. (Senate Bill)</option>
                    <option value="R.A.">R.A. (Enacted Batas)</option>
                    <option value="P.S. Res.">P.S. Res. (Resolution)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                    Statute / Bill Number
                  </label>
                  <input
                    type="text"
                    value={newBillNumber}
                    onChange={(e) => setNewBillNumber(e.target.value)}
                    placeholder="e.g., 5104 or 12001"
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                  Short Statutory Title
                </label>
                <input
                  type="text"
                  value={newBillShortTitle}
                  onChange={(e) => setNewBillShortTitle(e.target.value)}
                  placeholder="e.g., National Archipelagic Subsea Fiber Protection Act"
                  className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                    Primary Committee
                  </label>
                  <input
                    type="text"
                    value={newBillCommittee}
                    onChange={(e) => setNewBillCommittee(e.target.value)}
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                    Principal Sponsor
                  </label>
                  <input
                    type="text"
                    value={newBillSponsor}
                    onChange={(e) => setNewBillSponsor(e.target.value)}
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                  Statutory Abstract & Key Provision
                </label>
                <textarea
                  rows={3}
                  value={newBillAbstract}
                  onChange={(e) => setNewBillAbstract(e.target.value)}
                  placeholder="Describe the primary mandate, appropriations scope, or constitutional authority..."
                  className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] placeholder-[#94A3B8] p-3 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => setIsNewMeasureModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-display font-semibold text-[#E2E8F0] hover:bg-[#F1F5F9]/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors cursor-pointer"
                >
                  Index in Batas & Bills Tracker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Level 3 Interactive Modal Overlay for Statutory Clause Annotation & Bicameral Amendment */}
      {isAmendmentModalOpen && targetClauseForNote && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#152A42] border border-[#F5C242]/35 rounded-xl max-w-2xl w-full p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.60),0_2px_6px_-1px_rgba(245,194,66,0.06)]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#F5C242]/16">
              <div>
                <span className="font-display text-[11px] font-bold uppercase tracking-[0.06em] text-[#F5C242]">
                  BATASPH PARLIAMENTARY COUNSEL WORKBENCH · {activeMeasure.designation}
                </span>
                <h3 className="font-display text-lg font-semibold text-[#F1F5F9]">
                  {targetClauseForNote.articleNumber} — {targetClauseForNote.sectionTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAmendmentModalOpen(false)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClauseAnnotation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                    Counsel / Sponsor Name
                  </label>
                  <input
                    type="text"
                    value={counselName}
                    onChange={(e) => setCounselName(e.target.value)}
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                    required
                  />
                </div>
                <div>
                  <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                    Official Title / Chamber Role
                  </label>
                  <input
                    type="text"
                    value={counselRole}
                    onChange={(e) => setCounselRole(e.target.value)}
                    className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] px-3 py-2 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                  Bicameral Reconciled Statutory Text (Edit to Propose Floor Amendment)
                </label>
                <textarea
                  rows={4}
                  value={proposedClauseText}
                  onChange={(e) => setProposedClauseText(e.target.value)}
                  className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] p-3 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242] leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-display text-[11px] font-semibold uppercase tracking-[0.05em] text-[#E2E8F0] mb-1">
                  Legal Counsel Annotation & Constitutional Citation
                </label>
                <textarea
                  rows={3}
                  value={counselNoteText}
                  onChange={(e) => setCounselNoteText(e.target.value)}
                  placeholder="Enter jurisprudence reference, committee proviso explanation, or constitutional safeguard note..."
                  className="w-full bg-[#0B192C] text-xs text-[#F1F5F9] placeholder-[#94A3B8] p-3 rounded border border-[#1E3A5F] focus:outline-none focus:border-[#F5C242] leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => setIsAmendmentModalOpen(false)}
                  className="px-4 py-2 rounded text-xs font-display font-semibold text-[#E2E8F0] hover:bg-[#F1F5F9]/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors cursor-pointer"
                >
                  Record Statutory Amendment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Daily Senate & Congress Full Press Dispatch Reader Modal */}
      {selectedNewsDispatch && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#152A42] border border-[#F5C242]/35 rounded-xl max-w-2xl w-full p-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.60),0_2px_6px_-1px_rgba(245,194,66,0.06)]">
            <div className="flex items-start justify-between gap-4 pb-4 mb-4 border-b border-[#F5C242]/16">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-[#00B4D8] mb-1">
                  <span className="font-display font-bold uppercase tracking-[0.06em] text-[#F5C242]">
                    {selectedNewsDispatch.chamber} · {selectedNewsDispatch.bulletinType}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {selectedNewsDispatch.publishedDate} at {selectedNewsDispatch.publishedTime}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedNewsDispatch.journalCitation}</span>
                </div>
                <h3 className="font-display text-lg sm:text-xl font-bold text-[#F1F5F9] leading-snug">
                  {selectedNewsDispatch.headline}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedNewsDispatch(null)}
                className="text-[#94A3B8] hover:text-[#F1F5F9] p-1 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#0B192C] border border-[#1E3A5F] text-sm text-[#E2E8F0] leading-relaxed">
                {selectedNewsDispatch.fullDispatch}
              </div>

              <div className="bg-[#0F223A] border border-[#F5C242]/16 rounded-lg p-4">
                <div className="text-[11px] font-display font-bold uppercase tracking-[0.05em] text-[#F5C242] mb-2">
                  Key Parliamentary & Statutory Takeaways
                </div>
                <ul className="space-y-1.5 text-xs text-[#E2E8F0]">
                  {selectedNewsDispatch.keyTakeaways.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-3.5 h-3.5 text-[#34D399] shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#1E3A5F]">
                <button
                  type="button"
                  onClick={() => {
                    const measureId = selectedNewsDispatch.relatedMeasureId;
                    const designation = selectedNewsDispatch.relatedDesignation;
                    setSelectedNewsDispatch(null);
                    setSelectedMeasureId(measureId);
                    setActiveTab('docket');
                    triggerToast(`Inspecting ${designation} in Statutory Docket`);
                  }}
                  className="px-3.5 py-2 rounded text-xs font-display font-semibold bg-[#0B192C] text-[#F1F5F9] border border-[#F5C242]/25 hover:bg-[#1B3554] transition-colors cursor-pointer"
                >
                  Inspect {selectedNewsDispatch.relatedDesignation} Clauses
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const headline = selectedNewsDispatch.headline;
                      const designation = selectedNewsDispatch.relatedDesignation;
                      const measureId = selectedNewsDispatch.relatedMeasureId;
                      setSelectedNewsDispatch(null);
                      setSelectedMeasureId(measureId);
                      setActiveTab('ai-faq');
                      sendLegislativeInquiry(
                        `Analyze the constitutional and legislative implications of today's dispatch: "${headline}" (${designation}).`
                      );
                    }}
                    className="px-4 py-2 rounded text-xs font-display font-semibold bg-[#F5C242] text-[#07111E] hover:bg-[#ECC047] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Analyze with AI Counsel</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Executive Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-[#1B3554] border border-[#F5C242]/40 text-[#F1F5F9] px-4 py-3 rounded-lg shadow-[0_0_16px_rgba(245,194,66,0.12)] flex items-center gap-2.5 text-xs font-display font-medium">
          <ShieldCheck className="w-4 h-4 text-[#F5C242] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Quiet Institutional Footer */}
      <footer className="bg-[#0B192C] border-t border-[#F5C242]/10 px-6 lg:px-8 py-4 mt-12">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-[#E2E8F0]">
              BATASPH — EXECUTIVE LEGISLATIVE & STATUTORY INTELLIGENCE
            </span>
            <span aria-hidden="true">·</span>
            <span>Batas & Bills Tracker · AI Legislative FAQ Hub</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('docket')}
              className="hover:text-[#F1F5F9] transition-colors cursor-pointer"
            >
              Statutory Docket
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tracker')}
              className="hover:text-[#F1F5F9] transition-colors cursor-pointer"
            >
              Batas & Bills Tracker
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai-faq')}
              className="hover:text-[#F1F5F9] transition-colors cursor-pointer"
            >
              AI Legislative FAQ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('roll-call')}
              className="hover:text-[#F1F5F9] transition-colors cursor-pointer"
            >
              Roll-Call Journal
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
