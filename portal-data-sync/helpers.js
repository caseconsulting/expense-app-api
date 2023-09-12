/**
 * Converts a number of any format (1234567890 / 123-456-7890 / 123.456.7890) and converts it to a
 * dashed format (123-456-7890).
 *
 * @param number String - The passed phone number
 * @returns String - The phone number in dashed format
 */
function convertPhoneNumberToDashed(number) {
  if (number) {
    let n = number.replace(/\D/g, '');
    n = n.slice(0, 3) + '-' + n.slice(3, 6) + '-' + n.slice(6, 15);
    return n;
  } else {
    return null;
  }
} // convertPhoneNumberToDashed

module.exports = {
  convertPhoneNumberToDashed
};
