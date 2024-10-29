const router = require('express').Router()

router.get('/', (req, res) => {
    return res.render('index', { title: 'DSExchange' })
})

module.exports = router