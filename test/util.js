// Converts scientific notation to nomal number (in string type). See "https://stackoverflow.com/a/50978675".
function toNumber(value) {
  return Number(value).toLocaleString('fullwide', { useGrouping: false });
}

// Converts TNS to wei TNS.
function toWeiTNS(TNS) {
  return toNumber(Number(TNS) * Number("1000000000000000000"));
}

// Converts wei TNS to TNS.
function toTNS(weiTNS) {
  return toNumber(Number(weiTNS) / Number("1000000000000000000"));
}

module.exports = { toNumber, toWeiTNS, toTNS };
