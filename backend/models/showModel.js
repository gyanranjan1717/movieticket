import mongoose from "mongoose"

const showSchema = new mongoose.Schema(
  {
    movie: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'movieModel' },
    showDateTime: { type: Date, required: true }, // Data e Hora da sessão
    showPrice: { type: Number, required: true },
    occupiedSeats: { type: Object, default: {} }, 
  },
  { minimize: false } // with this show data can be created without any data means nothing is of schema 

)

const Show = mongoose.model("Show", showSchema);

export default Show;