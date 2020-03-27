/**
 * TrainingURLs model
 *
 * Fields:
 * - id (the url)
 * - hits
 * - category
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

    //sets null values to an empty string
    for (var propName in this) {
      if (this[propName] === null || this[propName] === undefined || this[propName] === '') {
        this[propName] = ' ';
      }
    }
  }
}

module.exports = TrainingUrls;
