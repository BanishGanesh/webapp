const productController = require('../controller/productController.js');
const { route } = require('./userRouter');
const router=require('express').Router()


router.post('/',productController.addproduct)

router.get('/:productId',productController.getproduct)

router.put('/:productId',productController.updateproduct)

router.patch('/:productId',productController.patchproduct)

router.delete('/:productId',productController.deleteproduct)

module.exports=router