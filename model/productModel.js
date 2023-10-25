module.exports=(sequelize,DataTypes)=>{
    const Product=sequelize.define("product",{
    id:{
     type:DataTypes.INTEGER,
     allowNull:false,
     autoIncrement: true,
     primaryKey: true
    },
    name:{
     type:DataTypes.STRING,
     allowNull:false
    },
    description:{
     type:DataTypes.STRING,
     allowNull:false
    },
    sku:{
     type:DataTypes.STRING,
     allowNull:false,
     unique:true
    },
    manufacturer:{
     type:DataTypes.STRING,
     allowNull:false
    },
    quantity:{
        type:DataTypes.INTEGER,
        allowNull:false
    },
    owner_user_id:{
        type: DataTypes.INTEGER
    }
 
    }, {
        timestamps: true,
        createdAt: 'date_added',
        updatedAt: 'date_last_updated'
      })
    return Product
 }