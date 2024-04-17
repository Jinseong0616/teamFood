'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Favorite extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Favorite.init({
    saveId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type : DataTypes.INTEGER,
    },
    userId: DataTypes.STRING,
    restaurantId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Favorite',
    id : false
  });
  return Favorite;
};