export class Identity {
  address: [{}];
  biometricInf: {};
  idType: string;
  category: string;
  dobs: [{}];
  docs: [{}];
  features: [{}];
  livingStatus: string;
  genderStatus: string;
  pobs: {};
  names: {};
  nationaltty: [string];
  idTitle: string;
  idDesig: string;
  comment: string;
  tabId: {};
  constructor(
    address: [{}],
    biometricInf: {},
    names: {},
    dobs: [{}],
    docs: [{}],
    features: [{}],
    livingStatus: string,
    genderStatus: string,
    nationaltty: [string],
    idType: string,
    category: string,
    pobs: {},
    idTitle,
    idDesig,
    idNotes,
    tabId
  ) {
    this.address = address;
    this.biometricInf = biometricInf;
    this.dobs = dobs;
    this.setdocs(docs);
    this.setFeatures(features);
    this.livingStatus = livingStatus;
    this.genderStatus = genderStatus;
    this.setNames(names);
    this.pobs = pobs;
    this.nationaltty = nationaltty;
    this.idType = idType;
    this.category = category;
    this.idTitle = idTitle;
    this.idDesig = idDesig;
    this.comment = idNotes;
    this.tabId = tabId;
  }

  public get getAddress(): [{}] {
    return this.address;
  }
  public get getBiometricInf(): {} {
    return this.biometricInf;
  }

  public get getIdType(): string {
    return this.idType;
  }
  public get getCategory(): string {
    return this.category;
  }

  get getdobs(): [{}] {
    return this.dobs;
  }

  public get getdocs(): [{}] {
    return this.docs;
  }

  public get getFeatures(): any[] {
    let features = [];
    let faatures = this.features["feature"].map((feat) => ({
      fStatus: feat["status"],
      fValue: feat["value"],
      featureType: feat["featureType"],
      fNotes: feat["note"],
    }));
    this.features = faatures;
    return features;
  }

  public get getLivingStatus(): string {
    return this.livingStatus;
  }

  public get getGenderStatus(): string {
    return this.genderStatus;
  }

  public get getNames(): {} {
    return this.names;
  }
  public get getPobs(): {} {
    return this.pobs;
  }
  public get getNationaltty(): [string] {
    return this.nationaltty;
  }

  public setFeatures(features) {
    let faaturesArr = features["feature"].map((feat) => ({
      fStatus: feat["status"],
      fValue: feat["value"],
      featureType: feat["featureType"],
      fNotes: feat["note"],
    }));
    this.features = faaturesArr;
  }

  public setNames(names) {
    let namesArr = names["name"].map((nm) => ({
      name: nm["value"],
      script: nm["script"],
      order: nm["order"],
      nameType: nm["nameType"],
    }));
    let nameOrgScptArr = names["nameOrgSpt"].map((nm) => ({
      name: nm["value"],
      script: nm["script"],
      order: nm["order"],
      nameType: nm["nameType"],
    }));
    let namesObj = {};
    namesObj["names"] = namesArr;
    namesObj["nameOrgSpt"] = nameOrgScptArr;
    this.names = namesObj;
  }

  public setdocs(docsArr) {
    let docs = docsArr["document"].map((doc) => ({
      docNum: doc["docNumber"],
      docType: doc["documentType"],
      docTyp1: doc["docType1"],
      issueDte: doc["issuedDate"],
      expDte: doc["expDate"],
      issuingCntry: doc["issuingCountry"],
      issuedCntry: doc["issuedCountry"],
      issuingCity: doc["issuedCity"],
      note: doc["note"],
    }));
    this.docs = docs;
  }
}

export class ActivityLog {
  activityDate: Date;
  userEmail: String;
  userTask: String;
  activityNotes: string;
  prevState: String;
  nextState: String;
  refNum: string;
  orderId: number;

  constructor(
    activityDate: Date,
    userEmail: string,
    userTask: string,
    prevState,
    nextState,
    activityNotes,
    refNum,
    orderId
  ) {
    this.activityDate = activityDate;
    this.userTask = userTask;
    this.activityNotes = activityNotes;
    this.userEmail = userEmail;
    this.prevState = prevState;
    this.nextState = nextState;
    this.refNum = refNum;
    this.orderId = orderId;
  }
}

export class SanctionInputEntry {
  recType: string;
  status: string;
  interpolNum: string;
  regime: string;
  refNum: string;
  lstngNotes: string;
  mbrStConfid: boolean;
  submittdBy: string[];
  submittdOn: string;
  statementConfid: string;
  lstngReason: string;
  addtlInfo: string;
  relatdLst: string[];
  availDte: string;
  lstReq: {};
  narrativeSumm: {};
  newEntry: [{}];
  idArr: Identity[];
  removedStatusDte: Date;
  removedStatusReason: string;
  priortoremovedState: string;
  activityLog: ActivityLog[];
  measureArr: [string];
  updatedArr: [{}];
  lstRmrks: string;
  rptStatusCount: number;
  rptStatusDates: [Date];
  statusModifiedDte: Date;
  amendmentInfo: {};
  amendmentId: string;
  amendmentCt: number;
  versionId: string;
  supersededInfo: {};
  ancestorsArr: any[];
  children: any[];
  parent: string;
  siblingsArr: any[];
  sameSubjectFoundInEntriesArr: any[];
  docUnderscoreId: {};
  workingMainLanguage: string;
  userEmail: string;
  submitReviewResult: any[];
  isSubmitForReviewConfirmed: Boolean;
  translated: Boolean;

  constructor(
    recType: string,
    status: string,
    interpolNum: string,
    regime: string,
    refNum: string,
    lstngNotes: string,
    mbrStConfid: boolean,
    submittdBy: string[],
    submittdOn: string,
    lstngReason: string,
    addtlInfo: string,
    relatdLst: string[],
    availDte: string,
    newEntry: [{}],
    idArr: Identity[],
    lstReq: {},
    narrativeSumm: {},
    removedStatusDte,
    removedStatusReason,
    priortoremovedState,
    activityLog: ActivityLog[],
    statementConfid,
    measureArr: [string],
    updatedArr: [{}],
    lstRmrks: string,
    rptStatusCount,
    rptStatusDates,
    statusModifiedDte: Date,
    amendmentInfo: {},
    versionId: string,
    supersededInfo,
    ancestorsArr,
    parent,
    siblingsArr,
    sameSubjectFoundInEntriesArr,
    docUnderscoreId,
    amendmentId: string,
    workingMainLanguage: string,
    userEmail: string,
    submitReviewResult: any[],
    isSubmitForReviewConfirmed: Boolean,
    translated: Boolean
  ) {
    this.recType = recType;
    this.status = status;
    this.interpolNum = interpolNum;
    this.regime = regime;
    this.refNum = refNum;
    lstngNotes = lstngNotes;
    this.mbrStConfid = mbrStConfid;
    this.submittdBy = submittdBy;
    this.submittdOn = submittdOn;
    this.lstngReason = lstngReason;
    this.addtlInfo = addtlInfo;
    this.relatdLst = relatdLst;
    this.availDte = availDte;
    this.lstReq = lstReq;
    this.narrativeSumm = narrativeSumm;
    this.newEntry = newEntry;
    this.idArr = idArr;
    this.removedStatusDte = removedStatusDte;
    this.removedStatusReason = removedStatusReason;
    this.statementConfid = statementConfid;
    this.priortoremovedState = priortoremovedState;
    this.activityLog = activityLog;
    this.measureArr = measureArr;
    this.updatedArr = updatedArr;
    this.lstRmrks = lstRmrks;
    this.rptStatusCount = rptStatusCount;
    this.rptStatusDates = rptStatusDates;
    this.statusModifiedDte = statusModifiedDte;
    this.amendmentInfo = amendmentInfo;
    this.versionId = versionId;
    this.supersededInfo = supersededInfo;
    this.ancestorsArr = ancestorsArr;
    this.parent = parent;
    this.siblingsArr = siblingsArr;
    this.sameSubjectFoundInEntriesArr = sameSubjectFoundInEntriesArr;
    this.docUnderscoreId = docUnderscoreId;
    this.amendmentId = amendmentId;
    this.workingMainLanguage = workingMainLanguage;
    this.userEmail = userEmail;
    this.submitReviewResult = submitReviewResult;
    this.isSubmitForReviewConfirmed = isSubmitForReviewConfirmed;
    this.translated = translated;
  }

  public get getRecType(): string {
    return this.recType;
  }

  public get getStatus(): string {
    return this.status;
  }
  public get getInterpolNum(): string {
    return this.interpolNum;
  }

  public get getRegime(): string {
    return this.regime;
  }
  public get getRefNum(): string {
    return this.refNum;
  }

  public get getLstngNotes(): string {
    return this.lstngNotes;
  }
  public get getMbrStConfid(): boolean {
    return this.mbrStConfid;
  }
  public get getSubmittdBy(): string[] {
    return this.submittdBy;
  }
  public get getSubmittdOn(): string {
    return this.submittdOn;
  }

  public get getLtngReason(): string {
    return this.lstngReason;
  }
  public get getAddtlInfo(): string {
    return this.addtlInfo;
  }

  public get getRelatdLst(): string[] {
    return this.relatdLst;
  }
  get getAvailDte(): string {
    return this.availDte;
  }

  public get getLstReq(): {} {
    return this.lstReq;
  }

  public get getNarrativeSumm(): {} {
    return this.narrativeSumm;
  }

  public get getNewEntry(): [{}] {
    return this.newEntry;
  }

  public get getIsRemovedReason(): string {
    return this.removedStatusReason;
  }

  public get getIsRemovedDte(): Date {
    return this.removedStatusDte;
  }

  public get getActivtyLog(): {} {
    return this.activityLog;
  }

  public get getLstRmrks(): string {
    return this.lstRmrks;
  }
}
