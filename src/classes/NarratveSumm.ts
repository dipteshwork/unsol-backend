export default class NarrtvSumm {
  lstingReason;
  addtlInfo;
  reltedLst;
  availDte;
  constructor(
    lstingReason: string,
    addtlInfo: string,
    reltedLst: string,
    availDte: string
  ) {
    this.lstingReason = lstingReason;
    this.addtlInfo = addtlInfo;
    this.availDte = availDte;
    this.reltedLst = reltedLst;
  }
}
