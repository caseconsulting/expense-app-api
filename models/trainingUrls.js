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
    this.hits = data.hits;
    this.category = data.category;
  }
}

module.exports = TrainingUrls;
