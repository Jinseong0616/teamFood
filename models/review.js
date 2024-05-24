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
      Review.belongsTo(models.Store, {
        foreignKey: 'restaurantId'
      });
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
    taste: DataTypes.STRING,
    price : DataTypes.STRING,
    service : DataTypes.STRING,
    content: DataTypes.STRING,
    rating: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Review',
    id : false
  });
  return Review;
};