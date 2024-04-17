'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Review extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Review.init({
    reviewId:{
      allowNull : false,
      autoIncrement : true,
      primaryKey : true,
      type : DataTypes.INTEGER,
    },
    userId: DataTypes.STRING,
    restaurantId: DataTypes.INTEGER,
    content: DataTypes.STRING,
    regDate: DataTypes.DATE,
    rating: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Review',
    id : false
  });
  return Review;
};