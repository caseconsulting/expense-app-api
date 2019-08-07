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
  }
}

module.exports = TrainingUrls;
