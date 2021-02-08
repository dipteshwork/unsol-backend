export default class Address {
  city;
  country;
  location;
  note;
  stateProvince;
  street;
  zipCode;
  constructor(
    city: string,
    country: string,
    location: { lat: number; lng: number; region: string },
    note: string,
    stateProvince: string,
    street: string,
    zipCode: string
  ) {
    this.city = city;
    this.country = country;
    this.location = location;
    this.note = note;
    this.stateProvince = stateProvince;
    this.street = street;
    this.zipCode = zipCode;
  }
  public get City(): string {
    return this.city;
  }
  public get Country(): string {
    return this.country;
  }
  public get Location() {
    return this.location;
  }
  public get Note(): string {
    return this.note;
  }
  public get StateProvince(): string {
    return this.stateProvince;
  }
  public get Street(): string {
    return this.street;
  }
  public get ZipCode(): string {
    return this.zipCode;
  }
}
