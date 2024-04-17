'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Image extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Image.init({
    imgId:{
      autoIncrement : true,
      allowNull : false,
      primaryKey : true,
      type : DataTypes.INTEGER,
    }, 
    reviewId: DataTypes.INTEGER,
    userId: DataTypes.STRING,
    restaurantId: DataTypes.INTEGER,
    imgUrl: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Image',
    id : false
  });
  return Image;
};