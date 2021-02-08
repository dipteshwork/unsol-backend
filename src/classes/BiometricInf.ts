export default class BiometricInf {
  bioMType;
  bioMVal;
  bioMAttch;
  bioMNote;
  constructor(
    bioMType: string,
    bioMVal: string,
    bioMAttch: string,
    bioMNote: string
  ) {
    this.bioMType = bioMType;
    this.bioMVal = bioMVal;
    this.bioMAttch = bioMAttch;
    this.bioMNote = bioMNote;
  }
  public get BioMType(): string {
    return this.bioMType;
  }
  public get BioMVal(): string {
    return this.bioMVal;
  }
  public get BioMAttch(): string {
    return this.bioMAttch;
  }
  public get BioMNote(): string {
    return this.bioMNote;
  }
}
