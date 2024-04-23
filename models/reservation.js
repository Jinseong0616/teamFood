'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reservation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Reservation.init({
    reservationId: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type : DataTypes.INTEGER,
    },
    restaurantId: DataTypes.INTEGER,
    userId: DataTypes.STRING,
    reservationDate: DataTypes.STRING,
    reservationTime: DataTypes.STRING,
    reservationStatus: DataTypes.STRING,
    people: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Reservation',
    id : false
  });
  return Reservation;
};