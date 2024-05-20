'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Responses extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Responses.init({
    responseId: {
      type: DataTypes.INTEGER,
      primaryKey : true
    },
    complainId: DataTypes.INTEGER,
    adminId: DataTypes.STRING,
    content: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Response',
    id : false
  });
  return Responses;
};