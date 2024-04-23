'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Store extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Store.init({
    restaurantId:{
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    }, 
    restaurantName: DataTypes.STRING,
    restaurantAddress: DataTypes.STRING,
    openTime: DataTypes.STRING,
    category: DataTypes.STRING,
    callNumber: DataTypes.STRING,
    views: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Store',
    id : false
  });
  return Store;
};