export default class Country {
  constructor(
    unName,
    m49Cde,
    isoCde,
    enShort,
    frShort,
    apShort,
    ruShort,
    chShort,
    arShort,
    mberShpNum,
    enformal,
    frformal,
    spformal,
    ruformal,
    chformal,
    arformal,
    isActive,
  ) {
    let countryObj = {};
    return (countryObj = {
      UN_name: unName,
      M49_code: m49Cde,
      ISO_code: isoCde,
      en_Short: enShort,
      fr_Short: frShort,
      sp_Short: apShort,
      ru_Short: ruShort,
      ch_Short: chShort,
      ar_Short: arShort,
      UN_Membership: mberShpNum,
      en_Formal: enformal,
      fr_Formal: frformal,
      sp_Formal: spformal,
      ru_Formal: ruformal,
      ch_Formal: chformal,
      ar_Formal: arformal,
      isActive: isActive,
    });
  }
}
