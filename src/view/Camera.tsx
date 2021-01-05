import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import rtc from '../lib/rtc';

function Camera() {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const screenshotsRef = useRef<HTMLCanvasElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream>();

  useEffect(() => {
    rtc.startAudioStream();

    setTimeout(() => {
      rtc.startRecord();
    }, 3000);

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        width: {
          exact: 1280,
        },
        height: {
          exact: 720,
        },
      },
    };

    //判断流对象是否为空
    if (localStream) {
      //迭代并停止所有轨道
      localStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess).catch(handleError);

    function handleError(error: DOMException) {
      console.error('error: %o', error);
      if (error.name === 'ConstraintNotSatisfiedError') {
        const v = constraints.video;
        //宽高尺寸错误
        console.error(`宽:${v} 高:${v} 设备不支持`);
      } else if (error.name === 'PermissionDeniedError') {
        console.error('没有摄像头和麦克风使用权限,请点击允许按钮');
      }
      console.error(`getUserMedia 错误: ${error.name}`, error);
    }

    function handleSuccess(stream: MediaStream) {
      const videoTracks = stream.getVideoTracks();
      setLocalStream(stream);
      localStream?.getTracks();
      console.log(`使用的摄像头设备：${videoTracks[0].label}`);
      if (cameraRef.current) {
        cameraRef.current.srcObject = stream;
      }
    }
  }, []);

  function handleScreenshots() {
    const video = cameraRef.current;
    const audioEl = audioRef.current;
    rtc.stopRecord();
    rtc.playRecordAudio(audioEl);
    if (screenshotsRef.current && video) {
      console.warn('cameraRef.current: %o', video);
      const width = video.videoWidth;
      const height = video.videoHeight;
      console.warn('width: %o', width);
      console.warn('height: %o', height);
      screenshotsRef.current.getContext('2d')?.drawImage(video, 0, 0, width, height);
    }
  }

  return (
    <Wrapper>
      <Video ref={cameraRef} autoPlay playsInline></Video>
      <audio ref={audioRef}></audio>
      <Screenshot ref={screenshotsRef}></Screenshot>
      <button onClick={handleScreenshots}>截屏</button>
    </Wrapper>
  );
}

export default Camera;

const Wrapper = styled.div``;

const Video = styled.video`
  width: 640px;
  height: 360px;
`;

const Screenshot = styled.canvas`
  width: 640px;
  height: 360px;
`;
