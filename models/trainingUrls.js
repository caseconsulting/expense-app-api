/**
 * TrainingURLs model
 *
 * Required Fields:
 * - id (the url)
 * - hits
 * - category
 *
 * Additional Fields:
 * - title
 * - description
 * - image
 * - logo
 * - publisher
 */

class TrainingUrls {
  constructor(data) {
    this.id = data.id;
    this.category = data.category;
    this.hits = data.hits;

    if (this.hits == null) {
      this.hits = 0; // default: 0 hits
    }

    // populate additional attributes
    for (let additionalAttributes in data) {
      this[additionalAttributes] = data[additionalAttributes];
    }
  } // constructor

  /**
   * Checks if a value is empty. Returns true if the value is null or a single character space String.
   *
   * @param value - value to check
   * @return boolean - value is empty
   */
  _isEmpty(value) {
    return value == null || value === ' ' || value === '';
  } // isEmpty
}

module.exports = TrainingUrls;
