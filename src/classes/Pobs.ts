import Address from "../classes/address";

export default class Pobs {
  address;
  constructor(address: Address) {
    this.address = address;
  }
  public get getPobAddress(): Address {
    return this.address;
  }
}
