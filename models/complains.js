'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Complains extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Complains.init({
    complainId: {
      type : DataTypes.INTEGER,
      primaryKey : true
    },
    userId: DataTypes.STRING,
    complainCategory: DataTypes.STRING,
    title : DataTypes.STRING,
    content: DataTypes.STRING,
    status: DataTypes.STRING,
    views:DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Complain',
    id : false
  });
  return Complains;
};