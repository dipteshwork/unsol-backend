export default class Names {
  nameType;
  order;
  script;
  name;
  constructor(nameType: string, order: string, script: string, name: string) {
    this.name = name;
    this.nameType = nameType;
    this.order = order;
    this.script = script;
  }
  public get getName(): string {
    return this.name;
  }
  public get getNameType(): string {
    return this.nameType;
  }
  public get getOrder() {
    return this.order;
  }
  public get getSript(): string {
    return this.script;
  }
}
