export default class Docs {
  docNumber;
  documentType;
  docType1;
  issuedDate;
  expDate;
  issuedCountry;
  issuingCountry;
  issuedCity;
  note;
  constructor(
    docNum: string,
    docType: string,
    docTyp1: string,
    issueDte: string,
    expDte: string,
    issuingCntry: string,
    issuedCntry: string,
    issuingCity: string,
    note: string
  ) {
    this.docNumber = docNum;
    this.documentType = docType;
    this.docType1 = docTyp1;
    this.issuedDate = issueDte;
    this.expDate = expDte;
    this.issuingCountry = issuingCntry;
    this.issuedCountry = issuedCntry;
    this.issuedCity = issuingCity;
    this.note = note;
  }
  public get DocNum(): string {
    return this.docNumber;
  }
  public get DocType(): string {
    return this.documentType;
  }
  public get DocTyp1() {
    return this.docType1;
  }
  public get IssueDte(): string {
    return this.issuedDate;
  }
  public get ExpDte(): string {
    return this.expDate;
  }
  public get IssuingCntry(): string {
    return this.issuingCountry;
  }
  public get IssuedCntry(): string {
    return this.issuedCountry;
  }
  public get IssuingCity(): string {
    return this.issuedCity;
  }
  public get Note(): string {
    return this.note;
  }
}
