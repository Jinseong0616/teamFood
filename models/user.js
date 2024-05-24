'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Review,{
        foreignKey: 'userId'
      })
    }
  }
  User.init({
    userId: {
      type : DataTypes.STRING,
      primaryKey : true
    },
    password: DataTypes.STRING,
    name: DataTypes.STRING,
    birthNum: DataTypes.STRING,
    address: DataTypes.STRING,
    phone: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'User',
    timestamps: false, // createdAt, updatedAt 컬럼 생성 방지
    createdAt: 'createdAt', // 자동 생성되는 createdAt 필드명 정의
    updatedAt: 'updatedAt',
    id : false
  });
  return User;
};