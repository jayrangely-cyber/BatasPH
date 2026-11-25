export type BillPrefix = 'ALL' | 'S.B.' | 'H.B.' | 'P.S. Res.' | 'R.A.';

export type LegislativeStage =
  | 'ENACTED / RATIFIED'
  | 'THIRD READING'
  | 'BICAMERAL CONFERENCE'
  | 'IN COMMITTEE'
  | 'EN BANC'
  | 'VETOED / ARCHIVED';

export type StatusCategory = 'enacted' | 'committee' | 'vetoed' | 'verified';

export interface StatutoryClause {
  id: string;
  articleNumber: string;
  sectionTitle: string;
  currentText: string;
  proposedAmendment?: string;
  committeeNote: string;
  constitutionalReference: string;
  amendedInBicameral: boolean;
  counselAnnotations: {
    id: string;
    author: string;
    role: string;
    timestamp: string;
    note: string;
  }[];
}

export interface RollCallVoteRecord {
  id: string;
  legislatorName: string;
  chamber: 'Senate' | 'House of Representatives';
  districtOrBloc: string;
  partyAffiliation: string;
  vote: 'YEA' | 'NAY' | 'ABSTAIN' | 'ABSENT';
  explanationOfVote?: string;
  timestamp: string;
}

export interface TimelineCheckpoint {
  stage: string;
  date: string;
  completed: boolean;
  current?: boolean;
  referenceDoc: string;
  details: string;
}

export interface StatutoryBrief {
  constitutionalityCheck: 'VERIFIED COMPLIANT' | 'REQUIRES AMENDMENT' | 'UNDER REVIEW';
  fiscalImpactEstimate: string;
  affectedStatutes: string[];
  executiveSummary: string;
  keyFindings: {
    title: string;
    clauseRef: string;
    analysis: string;
    riskLevel: 'LOW' | 'MODERATE' | 'HIGH';
  }[];
}

export interface LegislativeMeasure {
  id: string;
  prefix: 'S.B.' | 'H.B.' | 'P.S. Res.' | 'R.A.';
  number: string;
  designation: string;
  shortTitle: string;
  fullTitle: string;
  chamber: 'Senate' | 'House of Representatives' | 'Joint Bicameral';
  primaryCommittee: string;
  secondaryCommittee?: string;
  stage: LegislativeStage;
  statusCategory: StatusCategory;
  verifiedGazetteRef?: string;
  dateFiled: string;
  lastActionDate: string;
  sessionNumber: string;
  primaryAuthor: {
    name: string;
    title: string;
    chamber: string;
    initials: string;
    avatarUrl: string;
  };
  coSponsors: string[];
  voteTally: {
    yeas: number;
    nays: number;
    abstain: number;
    absent: number;
    thresholdRequired: string;
    resolutionStatus: string;
  };
  abstract: string;
  clauses: StatutoryClause[];
  timeline: TimelineCheckpoint[];
  statutoryBrief: StatutoryBrief;
  rollCall: RollCallVoteRecord[];
}

export interface CommitteeHearing {
  id: string;
  committeeName: string;
  chairperson: string;
  chamber: 'Senate' | 'House of Representatives' | 'Bicameral';
  roomLocation: string;
  scheduleDate: string;
  scheduleTime: string;
  quorumStatus: 'QUORUM VERIFIED' | 'PENDING ROLL CALL' | 'ADJOURNED';
  agendaMeasures: string[];
  publicCounselBrief: string;
}

export const LEGISLATIVE_MEASURES: LegislativeMeasure[] = [
  {
    id: 'hb-4728',
    prefix: 'H.B.',
    number: '4728',
    designation: 'H.B. No. 4728',
    shortTitle: 'National Critical Infrastructure & Sovereign Grid Resilience Act',
    fullTitle:
      'AN ACT ESTABLISHING THE SOVEREIGN ENERGY AND CRITICAL INFRASTRUCTURE CYBER-PHYSICAL RESILIENCE MANDATE, APPROPRIATING FUNDS THEREFOR, AND AMENDING REPUBLIC ACT NO. 9136',
    chamber: 'House of Representatives',
    primaryCommittee: 'Committee on Energy & National Security',
    secondaryCommittee: 'Committee on Appropriations',
    stage: 'BICAMERAL CONFERENCE',
    statusCategory: 'committee',
    verifiedGazetteRef: 'O.G. Supp. Vol. 122, No. 44',
    dateFiled: '2026-08-14',
    lastActionDate: '2026-11-23',
    sessionNumber: '20th Congress · Second Regular Session',
    primaryAuthor: {
      name: 'Hon. Aurelio V. Salcedo',
      title: 'Chairperson, Special Committee on Grid Security',
      chamber: 'House of Representatives · 2nd District',
      initials: 'AS',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    },
    coSponsors: [
      'Sen. Helena M. Valderama',
      'Rep. Carlos T. Roxas',
      'Rep. Katrina L. Evangelista',
      'Sen. Lorenzo D. Alcantara',
    ],
    voteTally: {
      yeas: 248,
      nays: 19,
      abstain: 6,
      absent: 12,
      thresholdRequired: 'Two-Thirds Plenary Majority (190 Votes)',
      resolutionStatus: 'APPROVED ON THIRD READING · TRANSMITTED TO BICAMERAL',
    },
    abstract:
      'Establishes mandatory air-gapped hardware telemetry, sovereign cryptographic attestation, and foreign equity caps on Tier-1 national power transmission and subsea telecommunications corridors.',
    clauses: [
      {
        id: 'sec-1',
        articleNumber: 'ARTICLE I · SECTION 1',
        sectionTitle: 'Declaration of Sovereign Infrastructure Policy',
        currentText:
          'It is hereby declared the policy of the State to safeguard continuous, autonomous operational control over critical national transmission utilities, subsea cable landing stations, and potable water distribution matrices against external disruption or unauthorized foreign state interdiction.',
        committeeNote:
          'Adopted unanimously by the Joint Committee on Energy and National Defense without floor objection.',
        constitutionalReference: 'Art. XII, Sec. 11 — Public Utilities & National Security',
        amendedInBicameral: false,
        counselAnnotations: [
          {
            id: 'ann-101',
            author: 'Atty. Clarissa M.Solis',
            role: 'Chief Parliamentary Legal Counsel',
            timestamp: '2026-11-22 18:40',
            note: 'Cross-verified against Supreme Court En Banc ruling in G.R. No. 241890 regarding public utility operation definitions.',
          },
        ],
      },
      {
        id: 'sec-4',
        articleNumber: 'ARTICLE II · SECTION 4',
        sectionTitle: 'Mandatory Hardware Attestation & Operational Control',
        currentText:
          'All Tier-1 grid operators and system dispatch authorities shall maintain 100% citizen-held executive control over supervisory control and data acquisition (SCADA) firmware. Foreign technical vendors shall be prohibited from remote diagnostic access.',
        proposedAmendment:
          'All Tier-1 grid operators and system dispatch authorities shall maintain 100% citizen-held executive control over supervisory control and data acquisition (SCADA) firmware. Foreign technical vendors shall be prohibited from remote diagnostic access, EXCEPT under a 24-hour emergency warrant countersigned by the National Security Adviser and reported to the Joint Congressional Oversight Committee within 48 hours.',
        committeeNote:
          'Bicameral Conference reconciliation inserted the emergency warrant exception requested by the Senate Energy panel.',
        constitutionalReference: 'Art. XII, Sec. 17 — Temporary Takeover of Public Utilities',
        amendedInBicameral: true,
        counselAnnotations: [
          {
            id: 'ann-102',
            author: 'Dir. Mateo G. Villanueva',
            role: 'Senate Legislative Reference Bureau',
            timestamp: '2026-11-23 14:15',
            note: 'The 48-hour reporting mandate ensures legislative oversight cannot be bypassed during prolonged emergency declarations.',
          },
        ],
      },
      {
        id: 'sec-9',
        articleNumber: 'ARTICLE IV · SECTION 9',
        sectionTitle: 'Sovereign Resilience Reserve Appropriation',
        currentText:
          'The sum of Fourteen Billion Five Hundred Million Pesos (₱14,500,000,000.00) is hereby appropriated out of the unappropriated surplus of the National Treasury for the immediate decommissioning of non-compliant telemetry nodes.',
        proposedAmendment:
          'The sum of Sixteen Billion Two Hundred Million Pesos (₱16,200,000,000.00) is hereby charged against the Special Malampaya Sovereign Energy Fund for the immediate decommissioning of non-compliant telemetry nodes and establishment of regional redundancy bunkers.',
        committeeNote:
          'Source of funding shifted from unappropriated Treasury surplus to the Special Sovereign Energy Fund per Department of Finance certification.',
        constitutionalReference: 'Art. VI, Sec. 25(4) — Special Appropriations Bill Certificate',
        amendedInBicameral: true,
        counselAnnotations: [
          {
            id: 'ann-103',
            author: 'Hon. Aurelio V. Salcedo',
            role: 'Principal Sponsor',
            timestamp: '2026-11-24 09:30',
            note: 'National Treasurer issued Certificate of Availability of Funds #2026-884A prior to Bicameral vote.',
          },
        ],
      },
      {
        id: 'sec-14',
        articleNumber: 'ARTICLE VI · SECTION 14',
        sectionTitle: 'Penal Sanctions & Corporate Franchise Revocation',
        currentText:
          'Any corporate officer, director, or compliance engineer who knowingly certifies non-compliant remote telemetry gateways shall suffer the penalty of prision mayor and perpetual disqualification from holding any position in a public utility, alongside automatic revocation of the legislative franchise.',
        committeeNote:
          'Retained House version strict liability threshold for executive officers.',
        constitutionalReference: 'Art. III, Sec. 14 — Due Process & Statutory Penalties',
        amendedInBicameral: false,
        counselAnnotations: [],
      },
    ],
    timeline: [
      {
        stage: 'First Reading & Committee Referral',
        date: '2026-08-18',
        completed: true,
        referenceDoc: 'Journal No. 12 · p. 44',
        details: 'Referred jointly to Energy and National Defense.',
      },
      {
        stage: 'Committee Report No. 318 Approved',
        date: '2026-09-29',
        completed: true,
        referenceDoc: 'C.R. No. 318-20C',
        details: 'Substituted 6 related measures after 4 public hearings.',
      },
      {
        stage: 'Second Reading & Period of Amendments',
        date: '2026-10-21',
        completed: true,
        referenceDoc: 'Congressional Record Vol. IV',
        details: 'Approved via viva voce vote with 3 committee amendments.',
      },
      {
        stage: 'Third Reading Plenary Roll Call',
        date: '2026-11-09',
        completed: true,
        referenceDoc: 'Roll Call Cert #2026-114',
        details: '248 Yeas, 19 Nays, 6 Abstentions.',
      },
      {
        stage: 'Bicameral Conference Committee',
        date: '2026-11-23',
        completed: false,
        current: true,
        referenceDoc: 'Bicam Docket #2026-09',
        details: 'Reconciling H.B. 4728 with Senate Bill No. 2890.',
      },
      {
        stage: 'Enrolled Bill & Presidential Ratification',
        date: 'Pending',
        completed: false,
        referenceDoc: 'Awaiting Bicam Ratification',
        details: 'Scheduled for plenary ratification prior to December recess.',
      },
    ],
    statutoryBrief: {
      constitutionalityCheck: 'VERIFIED COMPLIANT',
      fiscalImpactEstimate: '₱16.20B (Certified Special Fund)',
      affectedStatutes: ['R.A. No. 9136 (EPIRA)', 'R.A. No. 10175', 'C.A. No. 146 (Public Service Act)'],
      executiveSummary:
        'Measure satisfies Article VI Section 25(4) funding certification requirements and narrows foreign equity participation in critical dispatch nodes in alignment with amended Public Service Act safeguards.',
      keyFindings: [
        {
          title: 'Constitutional Utility Control Compliance',
          clauseRef: 'Art. II, Sec. 4',
          analysis:
            'Mandating 100% citizen control of SCADA firmware directly reinforces Art. XII Sec. 11 without violating bilateral investment treaty expropriation clauses.',
          riskLevel: 'LOW',
        },
        {
          title: 'Emergency Warrant Oversight Window',
          clauseRef: 'Art. II, Sec. 4 (Bicameral Proviso)',
          analysis:
            'The 24-hour vendor diagnostic exception introduces a narrow operational window; the 48-hour Congressional notification deadline is legally enforceable.',
          riskLevel: 'MODERATE',
        },
        {
          title: 'Treasury Certification Integrity',
          clauseRef: 'Art. IV, Sec. 9',
          analysis:
            'Reallocating ₱16.2B from the Special Sovereign Energy Fund avoids deficit borrowing and carries National Treasurer Certification #2026-884A.',
          riskLevel: 'LOW',
        },
      ],
    },
    rollCall: [
      {
        id: 'rc-1',
        legislatorName: 'Salcedo, Aurelio V.',
        chamber: 'House of Representatives',
        districtOrBloc: '2nd District, Iloilo',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        explanationOfVote: 'Principal Author — Sovereign grid autonomy is non-negotiable for national survival.',
        timestamp: '20:14:02',
      },
      {
        id: 'rc-2',
        legislatorName: 'Valderama, Helena M.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Constitutional Reform Bloc',
        vote: 'YEA',
        explanationOfVote: 'Concurs with Bicameral emergency warrant safeguard.',
        timestamp: '20:15:18',
      },
      {
        id: 'rc-3',
        legislatorName: 'Roxas, Carlos T.',
        chamber: 'House of Representatives',
        districtOrBloc: '1st District, Cebu City',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        timestamp: '20:16:04',
      },
      {
        id: 'rc-4',
        legislatorName: 'Montemayor, Rafael S.',
        chamber: 'House of Representatives',
        districtOrBloc: '3rd District, Davao',
        partyAffiliation: 'Independent Minority',
        vote: 'NAY',
        explanationOfVote: 'Objects to the 18-month compliance timeline as overly compressed for rural electric cooperatives.',
        timestamp: '20:18:45',
      },
      {
        id: 'rc-5',
        legislatorName: 'Evangelista, Katrina L.',
        chamber: 'House of Representatives',
        districtOrBloc: 'Lone District, Makati',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        timestamp: '20:19:12',
      },
      {
        id: 'rc-6',
        legislatorName: 'Alcantara, Lorenzo D.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        timestamp: '20:21:33',
      },
      {
        id: 'rc-7',
        legislatorName: 'Delgado, Victoriano P.',
        chamber: 'House of Representatives',
        districtOrBloc: 'Party-List · Industrial Labor',
        partyAffiliation: 'Progressive Minority',
        vote: 'ABSTAIN',
        explanationOfVote: 'Requests explicit anti-pass-through tariff protection for residential consumers.',
        timestamp: '20:23:09',
      },
      {
        id: 'rc-8',
        legislatorName: 'Guevarra, Estela N.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Independent Minority',
        vote: 'YEA',
        timestamp: '20:24:51',
      },
    ],
  },
  {
    id: 'sb-2890',
    prefix: 'S.B.',
    number: '2890',
    designation: 'S.B. No. 2890',
    shortTitle: 'Sovereign Artificial Intelligence & Algorithmic Accountability Act',
    fullTitle:
      'AN ACT REGULATING HIGH-IMPACT AUTOMATED DECISION SYSTEMS IN PUBLIC ADMINISTRATION, ESTABLISHING THE NATIONAL ALGORITHMIC AUDIT COMMISSION, AND DEFINING STATUTORY LIABILITY',
    chamber: 'Senate',
    primaryCommittee: 'Committee on Science, Technology & Constitutional Amendments',
    secondaryCommittee: 'Committee on Justice and Human Rights',
    stage: 'THIRD READING',
    statusCategory: 'verified',
    verifiedGazetteRef: 'Senate Journal No. 41 · Verified Passage',
    dateFiled: '2026-07-22',
    lastActionDate: '2026-11-24',
    sessionNumber: '20th Congress · Second Regular Session',
    primaryAuthor: {
      name: 'Sen. Helena M. Valderama',
      title: 'Senate President Pro Tempore',
      chamber: 'Senate of the Republic',
      initials: 'HV',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    },
    coSponsors: ['Sen. Lorenzo D. Alcantara', 'Sen. Estela N. Guevarra', 'Sen. Marco P. Zulueta'],
    voteTally: {
      yeas: 22,
      nays: 1,
      abstain: 1,
      absent: 0,
      thresholdRequired: 'Simple Plenary Majority (13 Senators)',
      resolutionStatus: 'VERIFIED SENATE PASSAGE · TRANSMITTED TO HOUSE',
    },
    abstract:
      'Mandates deterministic audit logs, human-in-the-loop judicial review, and open evidentiary disclosure for any automated scoring or predictive model utilized by executive agencies, revenue bureaus, or judicial tribunals.',
    clauses: [
      {
        id: 'sb-sec-1',
        articleNumber: 'ARTICLE I · SECTION 2',
        sectionTitle: 'Right to Human Adjudication & Algorithmic Due Process',
        currentText:
          'No citizen shall be denied social welfare benefits, tax clearances, bail eligibility, or administrative licenses solely on the basis of an unverified automated probabilistic computation without a signed written finding by an accountable public officer.',
        committeeNote: 'Core constitutional anchor endorsed by the Integrated Bar and Supreme Court OCJ observer.',
        constitutionalReference: 'Art. III, Sec. 1 — Equal Protection & Due Process Clause',
        amendedInBicameral: false,
        counselAnnotations: [
          {
            id: 'ann-201',
            author: 'Atty. Clarissa M. Solis',
            role: 'Chief Parliamentary Legal Counsel',
            timestamp: '2026-11-20 11:20',
            note: 'Establishes administrative due process parity for algorithmic adjudication.',
          },
        ],
      },
      {
        id: 'sb-sec-5',
        articleNumber: 'ARTICLE III · SECTION 5',
        sectionTitle: 'Mandatory Source Model Escrow & Bias Telemetry',
        currentText:
          'Contractors supplying automated classification software to the government shall deposit training weights and validation benchmarks with the National Algorithmic Audit Commission.',
        proposedAmendment:
          'Contractors supplying automated classification software to the government shall deposit reproducible evaluation harnesses, false-positive disparity matrices, and cryptographic model hashes with the National Algorithmic Audit Commission prior to procurement disbursement.',
        committeeNote: 'Amended on Second Reading to focus on reproducible evaluation harnesses rather than raw proprietary weights.',
        constitutionalReference: 'Art. XI, Sec. 1 — Public Office as a Public Trust',
        amendedInBicameral: true,
        counselAnnotations: [],
      },
    ],
    timeline: [
      {
        stage: 'First Reading & Senate Referral',
        date: '2026-07-24',
        completed: true,
        referenceDoc: 'S.J. No. 04',
        details: 'Referred to Science & Technology.',
      },
      {
        stage: 'Technical Working Group & Period of Interpellations',
        date: '2026-10-12',
        completed: true,
        referenceDoc: 'S.C.R. No. 94',
        details: 'Completed 6 sessions of floor debate.',
      },
      {
        stage: 'Third Reading Senate Roll Call',
        date: '2026-11-24',
        completed: true,
        current: true,
        referenceDoc: 'Senate Roll Call #2026-88',
        details: 'Passed 22-1-1; certified for House concurrence.',
      },
    ],
    statutoryBrief: {
      constitutionalityCheck: 'VERIFIED COMPLIANT',
      fiscalImpactEstimate: '₱1.85B (Initial Commission Charter)',
      affectedStatutes: ['R.A. No. 10173 (Data Privacy Act)', 'R.A. No. 9184 (Government Procurement Reform Act)'],
      executiveSummary:
        'Establishes clear evidentiary standards for algorithmic systems in government procurement without infringing trade secret protections.',
      keyFindings: [
        {
          title: 'Administrative Due Process Safeguard',
          clauseRef: 'Art. I, Sec. 2',
          analysis: 'Prevents unlawful delegation of quasi-judicial discretion to opaque software vendors.',
          riskLevel: 'LOW',
        },
      ],
    },
    rollCall: [
      {
        id: 'rc-sb-1',
        legislatorName: 'Valderama, Helena M.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Constitutional Reform Bloc',
        vote: 'YEA',
        explanationOfVote: 'Sponsor — Constitutional due process must govern automated state power.',
        timestamp: '16:40:10',
      },
      {
        id: 'rc-sb-2',
        legislatorName: 'Alcantara, Lorenzo D.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        timestamp: '16:42:00',
      },
      {
        id: 'rc-sb-3',
        legislatorName: 'Guevarra, Estela N.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Independent Minority',
        vote: 'YEA',
        timestamp: '16:43:15',
      },
      {
        id: 'rc-sb-4',
        legislatorName: 'Villamor, Sebastian R.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Opposition Bloc',
        vote: 'NAY',
        explanationOfVote: 'Concerns over procurement delays for municipal health diagnostics.',
        timestamp: '16:45:22',
      },
    ],
  },
  {
    id: 'ra-11984',
    prefix: 'R.A.',
    number: '11984',
    designation: 'R.A. No. 11984',
    shortTitle: 'Archipelagic Maritime Domain Awareness & Baseline Modernization Act',
    fullTitle:
      'AN ACT MODERNIZING THE ARCHIPELAGIC BASELINE HYDROGRAPHIC SURVEY, ESTABLISHING PERMANENT MARITIME DOMAIN SATELLITE TELEMETRY, AND APPROPRIATING FUNDS THEREFOR',
    chamber: 'Joint Bicameral',
    primaryCommittee: 'Committee on Foreign Relations & National Defense',
    stage: 'ENACTED / RATIFIED',
    statusCategory: 'enacted',
    verifiedGazetteRef: 'Official Gazette Vol. 122, No. 41 · Enacted Republic Act',
    dateFiled: '2026-05-10',
    lastActionDate: '2026-11-15',
    sessionNumber: '20th Congress · Second Regular Session',
    primaryAuthor: {
      name: 'Sen. Lorenzo D. Alcantara',
      title: 'Chairperson, Committee on National Defense',
      chamber: 'Senate of the Republic',
      initials: 'LA',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    },
    coSponsors: ['Rep. Aurelio V. Salcedo', 'Sen. Helena M. Valderama', 'Rep. Carlos T. Roxas'],
    voteTally: {
      yeas: 274,
      nays: 0,
      abstain: 2,
      absent: 9,
      thresholdRequired: 'Bicameral Ratification & Presidential Signature',
      resolutionStatus: 'SIGNED INTO LAW · REPUBLIC ACT NO. 11984',
    },
    abstract:
      'Codifies high-resolution synthetic aperture radar maritime monitoring across exclusive economic zones and mandates real-time public gazette publication of baseline coordinates.',
    clauses: [
      {
        id: 'ra-sec-1',
        articleNumber: 'ARTICLE I · SECTION 3',
        sectionTitle: 'Continuous Archipelagic Telemetry Mandate',
        currentText:
          'The National Mapping and Resource Information Authority (NAMRIA), in coordination with the Coast Guard and Space Agency, shall maintain continuous encrypted AIS and synthetic aperture radar telemetry across all statutory sea lanes.',
        committeeNote: 'Enacted without executive veto; Implementing Rules and Regulations (IRR) due within 60 days.',
        constitutionalReference: 'Art. I — National Territory & Archipelagic Doctrine',
        amendedInBicameral: false,
        counselAnnotations: [],
      },
    ],
    timeline: [
      {
        stage: 'Bicameral Conference Report Ratified',
        date: '2026-10-28',
        completed: true,
        referenceDoc: 'Bicam Report #2026-04',
        details: 'Unanimously ratified by both Chambers.',
      },
      {
        stage: 'Presidential Assent & Official Gazette Publication',
        date: '2026-11-15',
        completed: true,
        current: true,
        referenceDoc: 'O.G. Vol. 122, No. 41',
        details: 'Enacted as Republic Act No. 11984.',
      },
    ],
    statutoryBrief: {
      constitutionalityCheck: 'VERIFIED COMPLIANT',
      fiscalImpactEstimate: '₱24.00B (Multi-Year Obligational Authority)',
      affectedStatutes: ['R.A. No. 9522 (Archipelagic Baselines Law)', 'UNCLOS 1982 Ratification Instrument'],
      executiveSummary:
        'Fully enacted statute. Complies with UNCLOS Art. 47 archipelagic baseline publication standards.',
      keyFindings: [
        {
          title: 'UNCLOS Depositary Compliance',
          clauseRef: 'Art. I, Sec. 3',
          analysis: 'Directs automatic deposit of updated geodetic charts with the UN Secretary-General.',
          riskLevel: 'LOW',
        },
      ],
    },
    rollCall: [
      {
        id: 'rc-ra-1',
        legislatorName: 'Alcantara, Lorenzo D.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        timestamp: '14:10:00',
      },
      {
        id: 'rc-ra-2',
        legislatorName: 'Salcedo, Aurelio V.',
        chamber: 'House of Representatives',
        districtOrBloc: '2nd District, Iloilo',
        partyAffiliation: 'Majority Coalition',
        vote: 'YEA',
        timestamp: '14:11:12',
      },
    ],
  },
  {
    id: 'ps-res-512',
    prefix: 'P.S. Res.',
    number: '512',
    designation: 'P.S. Res. No. 512',
    shortTitle: 'Inquiry in Aid of Legislation on Sovereign Debt Service Transparency',
    fullTitle:
      'RESOLUTION DIRECTING THE SENATE BLUE RIBBON AND FINANCE COMMITTEES TO CONDUCT A JOINT INQUIRY, IN AID OF LEGISLATION, INTO CONTINGENT SOVEREIGN GUARANTEES ISSUED FOR PUBLIC-PRIVATE INFRASTRUCTURE CONCESSIONS',
    chamber: 'Senate',
    primaryCommittee: 'Committee on Accountability of Public Officers (Blue Ribbon)',
    secondaryCommittee: 'Committee on Finance',
    stage: 'IN COMMITTEE',
    statusCategory: 'committee',
    dateFiled: '2026-10-05',
    lastActionDate: '2026-11-21',
    sessionNumber: '20th Congress · Second Regular Session',
    primaryAuthor: {
      name: 'Sen. Estela N. Guevarra',
      title: 'Minority Floor Leader',
      chamber: 'Senate of the Republic',
      initials: 'EG',
      avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
    },
    coSponsors: ['Sen. Helena M. Valderama'],
    voteTally: {
      yeas: 14,
      nays: 2,
      abstain: 0,
      absent: 1,
      thresholdRequired: 'Joint Committee Majority Quorum',
      resolutionStatus: 'SUBPOENA DUCES TECUM ISSUED · HEARING IN PROGRESS',
    },
    abstract:
      'Compels disclosure of unbooked contingent liabilities, foreign exchange risk-sharing clauses, and arbitration waiver terms across 18 national tollway and rail concession agreements.',
    clauses: [
      {
        id: 'psr-sec-1',
        articleNumber: 'RESOLVED CLAUSE · PARAGRAPH 1',
        sectionTitle: 'Mandatory Production of Concession Risk Schedules',
        currentText:
          'The Department of Finance and the Public-Private Partnership Center are hereby directed to submit unredacted contingent liability ledgers covering Fiscal Years 2020 through 2026 within ten (10) calendar days.',
        committeeNote: 'Subpoena Duces Tecum approved by Committee Chair on November 19, 2026.',
        constitutionalReference: 'Art. VI, Sec. 21 — Legislative Inquiry in Aid of Legislation',
        amendedInBicameral: false,
        counselAnnotations: [],
      },
    ],
    timeline: [
      {
        stage: 'Resolution Filed & Referred to Blue Ribbon',
        date: '2026-10-05',
        completed: true,
        referenceDoc: 'P.S. Res. 512',
        details: 'Adopted for joint committee investigation.',
      },
      {
        stage: 'First Evidentiary Hearing & Subpoena Issuance',
        date: '2026-11-21',
        completed: false,
        current: true,
        referenceDoc: 'Blue Ribbon Docket #2026-19',
        details: 'Treasury officials directed to produce concession ledgers.',
      },
    ],
    statutoryBrief: {
      constitutionalityCheck: 'VERIFIED COMPLIANT',
      fiscalImpactEstimate: 'Oversight Inquiry (Auditing ₱340B Contingent Exposure)',
      affectedStatutes: ['R.A. No. 11966 (PPP Code of the Philippines)', 'R.A. No. 8182 (ODA Act)'],
      executiveSummary:
        'Exercises constitutional oversight under Art. VI Sec. 21. Executive privilege claims cannot shield commercial fiscal guarantee schedules.',
      keyFindings: [
        {
          title: 'Limits of Executive Privilege on Fiscal Guarantees',
          clauseRef: 'Resolved Clause · Para. 1',
          analysis: 'Supreme Court jurisprudence confirms sovereign debt guarantees are matters of public fiscal interest.',
          riskLevel: 'LOW',
        },
      ],
    },
    rollCall: [
      {
        id: 'rc-psr-1',
        legislatorName: 'Guevarra, Estela N.',
        chamber: 'Senate',
        districtOrBloc: 'National At-Large',
        partyAffiliation: 'Independent Minority',
        vote: 'YEA',
        timestamp: '10:15:00',
      },
    ],
  },
  {
    id: 'hb-3109',
    prefix: 'H.B.',
    number: '3109',
    designation: 'H.B. No. 3109',
    shortTitle: 'Regional Autonomous Tax Holiday & Blanket Tariff Exemption Bill',
    fullTitle:
      'AN ACT GRANTING PERPETUAL BLANKET CUSTOMS AND CORPORATE INCOME TAX EXEMPTIONS TO UNREGISTERED OFFSHORE LOGISTICS ZONES WITHOUT FISCAL INCENTIVES REVIEW BOARD OVERSIGHT',
    chamber: 'House of Representatives',
    primaryCommittee: 'Committee on Ways and Means',
    stage: 'VETOED / ARCHIVED',
    statusCategory: 'vetoed',
    verifiedGazetteRef: 'Presidential Veto Message · O.G. Vol. 122, No. 38',
    dateFiled: '2026-04-02',
    lastActionDate: '2026-10-30',
    sessionNumber: '20th Congress · Second Regular Session',
    primaryAuthor: {
      name: 'Rep. Rafael S. Montemayor',
      title: 'Representative, 3rd District',
      chamber: 'House of Representatives',
      initials: 'RM',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
    },
    coSponsors: ['Rep. Victoriano P. Delgado'],
    voteTally: {
      yeas: 162,
      nays: 98,
      abstain: 11,
      absent: 14,
      thresholdRequired: 'Two-Thirds Override Required (Not Attained)',
      resolutionStatus: 'PRESIDENTIAL VETO SUSTAINED · ARCHIVED IN JOURNAL',
    },
    abstract:
      'Proposed perpetual tax exemptions for special logistics hubs outside the jurisdiction of the Fiscal Incentives Review Board; returned unsigned by the President citing constitutional uniformity of taxation and severe revenue erosion.',
    clauses: [
      {
        id: 'hb3109-sec-1',
        articleNumber: 'ARTICLE II · SECTION 6',
        sectionTitle: 'Perpetual Blanket Fiscal Exemption',
        currentText:
          'Registered zone locators shall be exempt in perpetuity from all national internal revenue taxes, customs duties, and local government real property assessments without periodic performance audit.',
        committeeNote: 'Flagged by Department of Finance and vetoed by the President on October 30, 2026.',
        constitutionalReference: 'Art. VI, Sec. 28(1) — Uniformity and Equitability of Taxation',
        amendedInBicameral: false,
        counselAnnotations: [
          {
            id: 'ann-501',
            author: 'Atty. Clarissa M. Solis',
            role: 'Chief Parliamentary Legal Counsel',
            timestamp: '2026-10-31 09:00',
            note: 'Presidential Veto Message cites ₱68.4B annual revenue leakage and violation of CREATE More fiscal governance standards.',
          },
        ],
      },
    ],
    timeline: [
      {
        stage: 'Transmitted to Office of the President',
        date: '2026-10-02',
        completed: true,
        referenceDoc: 'Enrolled Copy #3109',
        details: 'Submitted for executive review.',
      },
      {
        stage: 'Presidential Veto Message Returned to House',
        date: '2026-10-30',
        completed: true,
        current: true,
        referenceDoc: 'Veto Message #2026-03',
        details: 'Archived in House Journal; override motion tabled.',
      },
    ],
    statutoryBrief: {
      constitutionalityCheck: 'REQUIRES AMENDMENT',
      fiscalImpactEstimate: '-₱68.40B Annual Revenue Erosion (DOF Estimate)',
      affectedStatutes: ['R.A. No. 11534 (CREATE Act)', 'National Internal Revenue Code of 1997'],
      executiveSummary:
        'Measure was vetoed in its entirety. Perpetual exemptions without time-bound performance metrics violate modern fiscal accountability statutes.',
      keyFindings: [
        {
          title: 'Unconstitutional Delegation of Tax Exemption Authority',
          clauseRef: 'Art. II, Sec. 6',
          analysis: 'Removes statutory oversight by the Secretary of Finance and FIRB.',
          riskLevel: 'HIGH',
        },
      ],
    },
    rollCall: [
      {
        id: 'rc-3109-1',
        legislatorName: 'Montemayor, Rafael S.',
        chamber: 'House of Representatives',
        districtOrBloc: '3rd District, Davao',
        partyAffiliation: 'Independent Minority',
        vote: 'YEA',
        timestamp: '18:02:11',
      },
      {
        id: 'rc-3109-2',
        legislatorName: 'Salcedo, Aurelio V.',
        chamber: 'House of Representatives',
        districtOrBloc: '2nd District, Iloilo',
        partyAffiliation: 'Majority Coalition',
        vote: 'NAY',
        explanationOfVote: 'Unacceptable erosion of national treasury revenues without FIRB audit controls.',
        timestamp: '18:04:19',
      },
    ],
  },
];

export const COMMITTEE_HEARINGS: CommitteeHearing[] = [
  {
    id: 'chg-01',
    committeeName: 'Bicameral Conference Committee on H.B. 4728 / S.B. 2890',
    chairperson: 'Sen. Helena M. Valderama & Rep. Aurelio V. Salcedo',
    chamber: 'Bicameral',
    roomLocation: 'protocol Hall A · Senate Wing',
    scheduleDate: '2026-11-25',
    scheduleTime: '09:30 AM PST',
    quorumStatus: 'QUORUM VERIFIED',
    agendaMeasures: ['H.B. No. 4728', 'S.B. No. 2890'],
    publicCounselBrief:
      'Final clause-by-clause reconciliation of Article II Section 4 (24-hour emergency SCADA diagnostic warrant) and Section 9 Sovereign Energy Fund certification.',
  },
  {
    id: 'chg-02',
    committeeName: 'Senate Blue Ribbon & Committee on Finance (Joint En Banc)',
    chairperson: 'Sen. Estela N. Guevarra',
    chamber: 'Senate',
    roomLocation: 'Session Hall II · Executive Floor',
    scheduleDate: '2026-11-26',
    scheduleTime: '10:00 AM PST',
    quorumStatus: 'QUORUM VERIFIED',
    agendaMeasures: ['P.S. Res. No. 512'],
    publicCounselBrief:
      'Examination of Department of Finance contingent sovereign guarantee ledgers and foreign arbitration risk schedules.',
  },
  {
    id: 'chg-03',
    committeeName: 'House Committee on Appropriations & Constitutional Amendments',
    chairperson: 'Rep. Carlos T. Roxas',
    chamber: 'House of Representatives',
    roomLocation: 'Plenary Annex Room 304',
    scheduleDate: '2026-11-27',
    scheduleTime: '02:00 PM PST',
    quorumStatus: 'PENDING ROLL CALL',
    agendaMeasures: ['H.B. No. 4728', 'R.A. No. 11984 (IRR Oversight)'],
    publicCounselBrief:
      'Review of multi-year obligational authorities for NAMRIA hydrographic baseline telemetry and Coast Guard radar stations.',
  },
];

export interface CongressionalNewsItem {
  id: string;
  chamber: 'Senate' | 'House of Representatives' | 'Joint Bicameral';
  bulletinType: 'PLENARY PASSAGE' | 'BICAMERAL ACCORD' | 'BLUE RIBBON SUBPOENA' | 'GAZETTE IRR' | 'APPROPRIATIONS';
  headline: string;
  summary: string;
  fullDispatch: string;
  keyTakeaways: string[];
  publishedDate: string;
  publishedTime: string;
  journalCitation: string;
  relatedMeasureId: string;
  relatedDesignation: string;
  featured?: boolean;
}

export const DAILY_CONGRESSIONAL_NEWS: CongressionalNewsItem[] = [
  {
    id: 'news-01',
    chamber: 'Senate',
    bulletinType: 'PLENARY PASSAGE',
    headline: 'Senate Approves S.B. No. 2890 on Third Reading (22–1–1), Mandating Algorithmic Due Process Across Public Agencies',
    summary:
      'In a late-evening plenary roll call, the Senate ratified the Sovereign Artificial Intelligence & Algorithmic Accountability Act, requiring human-in-the-loop sign-off and bias telemetry escrow for all government automated decision systems.',
    fullDispatch:
      'MANILA — The Senate of the Philippines on Tuesday evening approved Senate Bill No. 2890 on Third and Final Reading with 22 affirmative votes, 1 negative vote, and 1 abstention. Sponsored by Senate President Pro Tempore Helena M. Valderama, the measure prohibits revenue bureaus, social welfare agencies, and licensing tribunals from denying public entitlements solely through automated probabilistic scoring without a written finding signed by an accountable officer. Contractors must deposit reproducible evaluation harnesses with the newly chartered National Algorithmic Audit Commission prior to procurement disbursement.',
    keyTakeaways: [
      '22 Yeas, 1 Nay, 1 Abstention recorded in Senate Journal No. 41.',
      'Enforces Article III, Section 1 constitutional due process over public sector automated adjudication.',
      'Transmitted immediately to the House of Representatives for bicameral concurrence.',
    ],
    publishedDate: 'Nov 24, 2026',
    publishedTime: '18:45 PST',
    journalCitation: 'Senate Press Bureau · Journal No. 41',
    relatedMeasureId: 'sb-2890',
    relatedDesignation: 'S.B. No. 2890',
    featured: true,
  },
  {
    id: 'news-02',
    chamber: 'Joint Bicameral',
    bulletinType: 'BICAMERAL ACCORD',
    headline: 'Bicameral Panel Seals ₱16.2B Sovereign Energy Fund Proviso & 24-Hour SCADA Warrant for H.B. No. 4728',
    summary:
      'Conferees from the Senate and House reconciled disagreeing provisions in the Sovereign Grid Resilience Act, locking in 100% citizen control of dispatch firmware and National Treasurer certification #2026-884A.',
    fullDispatch:
      'MANILA — The Bicameral Conference Committee co-chaired by Rep. Aurelio V. Salcedo and Sen. Helena M. Valderama reached a final accord on House Bill No. 4728. To address grid emergency concerns without diluting national security safeguards, conferees inserted a narrow proviso under Article II, Section 4 allowing foreign vendor diagnostic access only under a 24-hour warrant countersigned by the National Security Adviser and reported to Congress within 48 hours. Funding of ₱16.20 Billion has been certified against the Special Sovereign Energy Fund.',
    keyTakeaways: [
      '100% Filipino executive control mandated over Tier-1 SCADA transmission firmware.',
      '₱16.20B Special Energy Fund appropriation certified under Art. VI, Sec. 25(4).',
      'Scheduled for bicameral ratification in both Chambers ahead of the December recess.',
    ],
    publishedDate: 'Nov 24, 2026',
    publishedTime: '16:20 PST',
    journalCitation: 'Bicameral Secretariat · Docket #2026-09',
    relatedMeasureId: 'hb-4728',
    relatedDesignation: 'H.B. No. 4728',
  },
  {
    id: 'news-03',
    chamber: 'House of Representatives',
    bulletinType: 'APPROPRIATIONS',
    headline: 'House Appropriations Panel Releases Multi-Year ₱24B Obligational Authority for R.A. 11984 Maritime Radar Stations',
    summary:
      'Following Presidential enactment of the Archipelagic Maritime Domain Awareness Act, the House Committee on Appropriations cleared the first tranche for NAMRIA and Coast Guard synthetic aperture radar telemetry.',
    fullDispatch:
      'QUEZON CITY — The House Committee on Appropriations chaired by Rep. Carlos T. Roxas convened its oversight briefing on Republic Act No. 11984, clearing the release schedule for the ₱24.00 Billion multi-year obligational authority. The funds underwrite continuous encrypted AIS and synthetic aperture radar coverage across exclusive economic zone sea lanes, alongside mandatory Official Gazette publication of updated hydrographic baseline coordinates for UNCLOS deposit.',
    keyTakeaways: [
      'Implementing Rules and Regulations (IRR) fast-tracked with NAMRIA and Philippine Coast Guard.',
      'Directs automatic geodetic chart deposit with the UN Secretary-General under UNCLOS Art. 47.',
    ],
    publishedDate: 'Nov 24, 2026',
    publishedTime: '14:10 PST',
    journalCitation: 'House HREP Press & Journal Service · Vol. IV',
    relatedMeasureId: 'ra-11984',
    relatedDesignation: 'R.A. No. 11984',
  },
  {
    id: 'news-04',
    chamber: 'Senate',
    bulletinType: 'BLUE RIBBON SUBPOENA',
    headline: 'Senate Blue Ribbon Enforces Subpoena Duces Tecum on ₱340B Contingent Sovereign Guarantee Ledgers',
    summary:
      'Presiding Chair Sen. Estela N. Guevarra rejected informal executive privilege claims under P.S. Res. No. 512, ordering unredacted production of 18 tollway and rail concession risk schedules.',
    fullDispatch:
      'MANILA — The Senate Committee on Accountability of Public Officers and Investigations (Blue Ribbon), sitting jointly with the Committee on Finance, issued a final compliance directive under P.S. Res. No. 512. Citing Supreme Court doctrine in Senate v. Ermita, Minority Floor Leader Estela N. Guevarra ruled that commercial fiscal guarantee schedules and foreign exchange risk-sharing clauses in public-private partnership concessions are matters of paramount public fiscal interest and must be submitted unredacted within 10 calendar days.',
    keyTakeaways: [
      'Audits ₱340B in unbooked contingent liabilities across 18 national infrastructure concessions.',
      'Reaffirms Congress inquiry powers in aid of legislation under Article VI, Section 21.',
    ],
    publishedDate: 'Nov 24, 2026',
    publishedTime: '11:30 PST',
    journalCitation: 'Blue Ribbon Committee Bulletin #2026-19',
    relatedMeasureId: 'ps-res-512',
    relatedDesignation: 'P.S. Res. No. 512',
  },
];

