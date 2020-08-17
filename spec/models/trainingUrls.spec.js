const TrainingUrl = require('../../models/trainingUrls');

describe('trainingUrls', () => {

  const URL = '{url}';
  const CATEGORY = '{category}';
  const HITS = 0;
  const TITLE = 'title';
  const DESCRIPTION = '{description}';
  const IMAGE = '{image}';
  const LOGO = '{logo}';
  const PUBLISHER = '{publisher}';

  const TRAINING_URL_DATA = {
    id: URL,
    category: CATEGORY,
    hits: HITS,
    title: TITLE,
    description: DESCRIPTION,
    image: IMAGE,
    logo: LOGO,
    publisher: PUBLISHER
  };

  let trainingUrl;

  beforeEach(() => {
    trainingUrl = new TrainingUrl(TRAINING_URL_DATA);
  });

  describe('constructor', () => {

    let localTrainingData;

    beforeEach(() => {
      localTrainingData = {
        id: URL,
        category: CATEGORY,
        hits: HITS,
        title: TITLE,
        description: DESCRIPTION,
        image: IMAGE,
        invalid: '{invalid}'
      };
      trainingUrl = new TrainingUrl(localTrainingData);
    });

    it('should populate required and optional values only', () => {
      expect(trainingUrl).toEqual(
        new TrainingUrl({id: URL,
          category: CATEGORY,
          hits: HITS,
          title: TITLE,
          description: DESCRIPTION,
          image: IMAGE
        }
        ));
    }); // should populate required and optional values only
  }); // constructor

  describe('_isEmpty', () => {

    describe('when value is undefined', () => {

      it('should return true', () => {
        expect(trainingUrl._isEmpty(undefined)).toBe(true);
      }); // should return true
    }); // when value is undefined

    describe('when value is null', () => {

      it('should return true', () => {
        expect(trainingUrl._isEmpty(null)).toBe(true);
      }); // should return true
    }); // when value is null

    describe('when value is a space character', () => {

      it('should return true', () => {
        expect(trainingUrl._isEmpty(' ')).toBe(true);
      }); // should return true
    }); // when value is a space character

    describe('when value is not empty', () => {

      it('should return false', () => {
        expect(trainingUrl._isEmpty('value')).toBe(false);
      }); // should return false
    }); // when value is not empty
  }); // _isEmpty
}); // trainingUrls
