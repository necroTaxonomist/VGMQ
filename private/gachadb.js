// MongoDB database
var mongoose = require('mongoose');

// Item Schema
var itemSchema = new mongoose.Schema(
    {
        name: String,
        item_name: { type: String, unique: true, required: true },
        kind: { type: String },
        rarity:
        {
            type: Number,
            default: function()
            {
                return Math.random() * 5;
            }
        },
        data: mongoose.Mixed
    },
    { collection: 'items' }
);
itemSchema.virtual('stars').get(
    function()
    {
        var numStars = Math.ceil(this.rarity);
        
        var str = "";
        for (i = 0; i < numStars; i += 1)
        {
            str += "⭐";
        }

        return str;
    }
);

// Item Model
var itemModel = mongoose.model('item', itemSchema);

// Returns all gacha items of a certain kind with the given rarity or below
// Returns a query
function findBelowRarity(kind, rarity)
{
    var query =
    {
        kind: kind,
        rarity: { $lte: rarity }
    };
    return itemModel.find(query);
}

module.exports =
{
    findBelowRarity
};
