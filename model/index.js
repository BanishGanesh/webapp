const dbConfig=require('../config/db.config.js');
const{Sequelize,DataTypes}=require('sequelize');
const sequelize=new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,{
        host: process.env.DB_HOST,
        dialect: dbConfig.dialect,
        // operatorsAliases: false,
    pool:{
        max: dbConfig.pool.max,
        min: dbConfig.pool.min,
        acquire: dbConfig.pool.acquire,
        idle: dbConfig.pool.idle
    },  
    define: {
        timestamps: false
    }  
    }
)
sequelize.authenticate()
.then(()=>{
  console.log("connected")
})
.catch(err=>{
    console.log(err);

})
const db={} 
db.Sequelize=Sequelize
db.sequelize=sequelize

db.users=require('./userModel.js')(sequelize,DataTypes)
db.products=require('./productModel.js')(sequelize,DataTypes)
db.images=require('./imageModel.js')(sequelize,DataTypes)
db.products.hasMany(db.images, { onDelete: 'CASCADE' });
db.images.belongsTo(db.products);
//db.products =require('./productsModel.js')(sequelize,DataTypes)
db.sequelize.sync({force:false})
.then(()=>{
    console.log("sync done")
})



module.exports=db