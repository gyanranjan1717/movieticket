import React from 'react';
import HeroSection from '../Components/HeroSection';
import FeatureSection from '../Components/FeatureSection';
import TrailerSection from '../Components/TrailerSection';
import MovieSlider from '../Components/movieSlider';
import VIPExperience from '../Components/VIPExperience';

const Home = () => {
  return (
    <div className="bg-black min-h-screen text-white overflow-x-hidden">
      <HeroSection />
      <MovieSlider />
      <FeatureSection />
      <TrailerSection />
      <VIPExperience />
    </div>
  );
};

export default Home;