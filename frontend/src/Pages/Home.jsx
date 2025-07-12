import React from 'react'
import HeroSection from '../Components/HeroSection'
import FeatureSection from '../Components/FeatureSection'
import TrailerSection from '../Components/TrailerSection'
import MovieSlider from '../Components/movieSlider'
const Home = () => {
  return (
    <>
    
      <HeroSection/>
      <MovieSlider/>
      <FeatureSection/>
      <TrailerSection/>
    </>
  )
}

export default Home