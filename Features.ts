export default class Features {
  featureType;
  status;
  value;
  note;
  title;
  constructor(
    featureType: string,
    fStatus: string,
    fValue: string,
    fNotes: string,
    title: string
  ) {
    this.featureType = featureType;
    this.status = fStatus;
    this.value = fValue;
    this.note = fNotes;
  }

  public get getFeatureType(): string {
    return this.featureType;
  }
  public get getFStatus(): string {
    return this.status;
  }
  public get getFValue() {
    return this.value;
  }
  public get getFNotes(): string {
    return this.note;
  }
}
