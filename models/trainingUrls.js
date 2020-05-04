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

    // populate empty fields with a space holder
    for (var propName in this) {
      if (this[propName] == null || this[propName] === '') {
        this[propName] = ' ';
      }
    }
  } // constructor
}

module.exports = TrainingUrls;
