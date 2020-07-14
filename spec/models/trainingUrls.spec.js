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

  let trainingData, trainingUrl;

  beforeEach(() => {
    trainingUrl = new TrainingUrl(TRAINING_URL_DATA);
    trainingData = {
      id: URL,
      category: CATEGORY,
      hits: HITS,
      title: TITLE,
      description: DESCRIPTION,
      image: IMAGE
    };
  });

  describe('constructor', () => {

    it('should populate additional attribute values', () => {
      expect(trainingData).toEqual(jasmine.objectContaining({
        id: URL,
        category: CATEGORY,
        hits: HITS,
        title: TITLE,
        description: DESCRIPTION,
        image: IMAGE
      }));
    }); // should populate additional attribute values
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
