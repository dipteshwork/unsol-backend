export default class NewEntry {
  entryType;
  Language;
  regime;
  constructor(entryType: string, Language: string, regime: string) {
    this.entryType = entryType;
    this.Language = Language;
    this.regime = regime;
  }
}
