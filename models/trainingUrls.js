/**
 * TrainingURLs model
 *
 * Fields:
 * - id (the url)
 * - hits
 * - category
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
    this.title = data.title;
    this.description = data.description;
    this.image = data.image;
    this.logo = data.logo;
    this.publisher = data.publisher;

    if (this.hits == null) {
      this.hits = 0; // default: 0 hits
    }

    // populate empty fields with a space holder
    for (let propName in this) {
      if (this._isEmpty(this[propName])) {
        this[propName] = ' ';
      }
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
