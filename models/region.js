'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class region extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  region.init({
    city: DataTypes.STRING,
    gu: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'region',
<<<<<<< HEAD
    id : false,
    defaultScope: {
      attributes: { exclude: ['id', 'createdAt', 'updatedAt'] } // id, createdAt, updatedAt를 제외하고 모든 쿼리에 적용
    }
=======
    id: false
>>>>>>> 79c3c124ba09abccd6072330dd8975136abf837c
  });

  return region;
};