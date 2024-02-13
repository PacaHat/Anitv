"use client"
import React, { useEffect, useRef, useState } from "react";
import "@vidstack/react/player/styles/base.css";
import styles from "./player.module.css";
import {
  MediaPlayer,
  MediaProvider,
  useMediaStore,
  useMediaRemote,
  Track,
  TextTrack,
} from "@vidstack/react";
import { useRouter } from "next/navigation";
import VideoProgressSave from '../../../utils/VideoProgressSave';
import { VideoLayout } from "./components/layouts/video-layout";
import { ContextSearch } from "../../../context/DataContext";

function Player({ dataInfo, groupedEp, sources, session, savedep,  subtitles, thumbnails, skiptimes}) {
  const { animetitle, nowPlaying, settings} = ContextSearch();
  const { epId, provider, epNum, subtype } = nowPlaying;
  const { previousep, currentep, nextep } = groupedEp;
  const [getVideoProgress, UpdateVideoProgress] = VideoProgressSave();
  const router = useRouter();
  const src = sources?.find(i => i.quality === "default" || i.quality === "auto")?.url || sources?.find(i => i.quality === "1080p")?.url;

  const playerRef = useRef(null);
  const { duration } = useMediaStore(playerRef);
  const remote = useMediaRemote(playerRef);

  const [opbutton, setopbutton] = useState(false);
  const [edbutton, setedbutton] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  let interval;

  useEffect(() => {
    playerRef.current?.subscribe(({ currentTime, duration }) => {

      if (skiptimes && skiptimes.length > 0) {
        const opStart = skiptimes[0]?.startTime ?? 0;
        const opEnd = skiptimes[0]?.endTime ?? 0;

        const epStart = skiptimes[1]?.startTime ?? 0;
        const epEnd = skiptimes[1]?.endTime ?? 0;

        const opButtonText = skiptimes[0]?.text || "";
        const edButtonText = skiptimes[1]?.text || "";

        setopbutton(opButtonText === "Opening" && (currentTime > opStart && currentTime < opEnd));
        setedbutton(edButtonText === "Ending" && (currentTime > epStart && currentTime < epEnd));

        if (settings?.autoskip) {
          if (currentTime > opStart && currentTime < opEnd) {
            Object.assign(playerRef.current ?? {}, { currentTime: opEnd });
            return null;
          }
          if (currentTime > epStart && currentTime < epEnd) {
            Object.assign(playerRef.current ?? {}, { currentTime: epEnd });
            return null;
          }
        }
      }

    })

  }, [settings]);

  function onCanPlay() {
    if (skiptimes && skiptimes.length > 0) {
      const track = new TextTrack({
        kind: 'chapters',
        default: true,
        label: 'English',
        language: 'en-US',
        type: 'json'
      });
      for (const cue of skiptimes) {
        track.addCue(new window.VTTCue(Number(cue.startTime), Number(cue.endTime), cue.text))
      }
      playerRef.current.textTracks.add(track);
    }
  }

  function onEnd() {
    // if (settings.autoNext) {
    // }
    // console.log("End")
    setIsPlaying(false);
  }

  function onEnded() {
    // if (autoNext) {
    //     getNextEpisode();
    // }
  }

  function onPlay() {
    // console.log("play")
    setIsPlaying(true);
  }

  function onPause() {
    // console.log("pause")
    setIsPlaying(false);
  }

  useEffect(() => {
    if (isPlaying) {
      interval = setInterval(async () => {
        const currentTime = playerRef.current?.currentTime
          ? Math.round(playerRef.current?.currentTime)
          : 0;

          if (session) {
            await fetch(`/api/watchhistory`, {
              method: "PUT",
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
              body: JSON.stringify({
                userName: session?.user?.name,
                aniId: String(dataInfo?.id),
                aniTitle: dataInfo.title?.[animetitle] || dataMedia.title?.romaji,
                epTitle: currentep?.title || `EP ${epNum}`,
                image: currentep?.image || currentep?.img ||
                       dataInfo?.bannerImage || dataInfo?.coverImage?.extraLarge || '',
                epId: epId,
                epNum: Number(epNum) || Number(currentep?.number),
                timeWatched: currentTime,
                duration: duration,
                provider: provider,
                nextepId: nextep?.id || null,
                nextepNum: nextep?.number || null,
                subtype: subtype
              })
            });
          }

        UpdateVideoProgress(dataInfo?.id, {
          aniId: String(dataInfo?.id),
          aniTitle: dataInfo.title?.[animetitle] || dataMedia.title?.romaji,
          epTitle: currentep?.title || `EP ${epNum}`,
          image: currentep?.image || currentep?.img ||
                 dataInfo?.bannerImage || dataInfo?.coverImage?.extraLarge || '',
          epId: epId,
          epNum: Number(epNum) || Number(currentep?.number),
          timeWatched: currentTime,
          duration: duration,
          provider: provider,
          nextepId: nextep?.id || null,
          nextepNum: nextep?.number || null,
          subtype: subtype,
          createdAt: new Date().toISOString(),
        });
      }, 5000);
    } else {
      clearInterval(interval);
    }

    return () => {
      clearInterval(interval);
    };
  }, [isPlaying, duration]);

  function onLoadedMetadata() {
    if(savedep && savedep[0]){
      const seekTime = savedep[0]?.timeWatched;
      if(seekTime){
        remote.seek(seekTime-3);
      }
    }
    else{
    const seek = getVideoProgress(dataInfo?.id);
    if (seek?.epNum === Number(epNum)) {
      const seekTime = seek?.timeWatched;
      const percentage = duration !== 0 ? seekTime / Math.round(duration) : 0;

      if (percentage >= 0.9) {
        remote.seek(0);
      }else {
        remote.seek(seekTime - 3);
      }
    }
    }
  }

  function handleop() {
    console.log("Skipping Intro");
    Object.assign(playerRef.current ?? {}, { currentTime: skiptimes[0]?.endTime ?? 0 });
  }

  function handleed() {
    console.log("Skipping Outro");
    Object.assign(playerRef.current ?? {}, { currentTime: skiptimes[1]?.endTime ?? 0 });
  }


  return (
    <MediaPlayer key={sources} ref={playerRef} playsInline aspectRatio={16 / 9} load={settings?.load || 'idle'} muted={settings?.audio || false}
      autoFocus={true} autoPlay={settings?.autoplay || false}
     title={currentep?.title || `EP ${epNum}` || 'Loading...'}
    className={`${styles.player} player relative`}
      crossOrigin={"anonymous"}
      streamType="on-demand"
      onEnd={onEnd}
      onEnded={onEnded}
      onCanPlay={onCanPlay}
      src={{
        src: src,
        type: "application/x-mpegurl",
      }}
      onPlay={onPlay}
      onPause={onPause}
      onLoadedMetadata={onLoadedMetadata}
    // onTimeUpdate={onTimeUpdate}
    >
      <MediaProvider>
        {subtitles && subtitles?.map((track) => (
          <Track {...track} key={track.src} />
        ))}
      </MediaProvider>
      {opbutton && <button onClick={handleop} className='absolute bottom-[70px] sm:bottom-[83px] right-4 z-[40] bg-white text-black py-2 px-3 rounded-[6px] font-medium text-[15px]'>Skip Opening</button>}
      {edbutton && <button onClick={handleed} className='absolute bottom-[70px] sm:bottom-[83px] right-4 z-[40] bg-white text-black py-2 px-3 rounded-[6px] font-medium text-[15px]'>Skip Ending</button>}
      <VideoLayout
      subtitles={subtitles}
      thumbnails={thumbnails ? process.env.NEXT_PUBLIC_PROXY_URI + thumbnails[0]?.url : ""}
      groupedEp={groupedEp}
    />
    </MediaPlayer>
  )
}

export default Player