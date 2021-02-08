export default class Dobs {
  dobType;
  dobSubset;
  date;
  dateFrom;
  dateTo;
  note;
  dobSubsetDte;
  constructor(
    type: string,
    dobSubset: string,
    dobSpecDte: string,
    dobFrom: string,
    dobTo: string,
    dobNote: string,
    dobSubsetDte: string
  ) {
    this.dobType = type;
    this.dobSubset = dobSubset;
    this.dobSubsetDte = dobSubsetDte;
    this.date = dobSpecDte;
    this.dateFrom = dobFrom;
    this.dateTo = dobTo;
    this.note = dobNote;
  }
  public get getType(): string {
    return this.dobType;
  }
  public get getDobSubset(): string {
    return this.dobSubset;
  }
  public get getDobSpecDte() {
    return this.date;
  }
  public get getDobFrom(): string {
    return this.dateFrom;
  }
  public get getDobTo(): string {
    return this.dateTo;
  }

  public get getDobSubsetDte(): string {
    return this.dobSubsetDte;
  }

  public get getDobNote(): string {
    return this.note;
  }
}
