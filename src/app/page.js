"use server"
import Animecard from '@/components/CardComponent/Animecards'
import Herosection from '@/components/home/Herosection'
import Navbarcomponent from '@/components/navbar/Navbar'
import { TrendingAnilist, PopularAnilist, Top100Anilist, SeasonalAnilist } from '@/lib/Anilistfunctions'
import React from 'react'
import { MotionDiv } from '@/utils/MotionDiv'
import VerticalList from '@/components/home/VerticalList'
import ContinueWatching from '@/components/home/ContinueWatching'
import RecentEpisodes from '@/components/home/RecentEpisodes'
import { getAuthSession } from './api/auth/[...nextauth]/route'
import { getWatchHistory } from '@/lib/EpHistoryfunctions'
// import { getWatchHistory } from '@/lib/EpHistoryfunctions'

async function getHomePage() {
  try {
    const [herodata, populardata, top100data, seasonaldata] = await Promise.all([
      TrendingAnilist(),
      PopularAnilist(),
      Top100Anilist(),
      SeasonalAnilist()
    ]);
    return { herodata, populardata, top100data, seasonaldata };
  } catch (error) {
    console.error("Error fetching homepage from anilist: ", error);
    return { herodata: [], populardata: [], top100data: [], seasonaldata: [] };
  }
}

async function Home() {
  const session = await getAuthSession();
  const { herodata = [], populardata = [], top100data = [], seasonaldata = [] } = await getHomePage();

  return (
    <div>
      <Navbarcomponent home={true} />
      <Herosection data={herodata} />
      <div className='sm:max-w-[97%] md:max-w-[95%] lg:max-w-[90%] xl:max-w-[85%] mx-auto flex flex-col md:gap-11 sm:gap-7 gap-5 mt-8'>
        <div
        >
          <ContinueWatching session={session} />
        </div>
        <div
        >
          <RecentEpisodes cardid="Recent Episodes" />
        </div>
        <div
        >
          <Animecard data={herodata} cardid="Trending Now" />
        </div>
        <div
        >
          <Animecard data={populardata} cardid="All Time Popular" />
        </div>
        <div
        >
          <div className='lg:flex lg:flex-row justify-between lg:gap-20'>
            <VerticalList data={top100data} mobiledata={seasonaldata} id="Top 100 Anime" />
            <VerticalList data={seasonaldata} id="Seasonal Anime" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
