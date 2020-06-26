import webexSDKAdapter from './start';

let MEETING_ID = null;

function handleAudio() {
  webexSDKAdapter.meetingsAdapter.meetingControls['mute-audio'].display(MEETING_ID).subscribe((data) => {
    const muteAudio = document.getElementById('mute-audio');

    muteAudio.innerHTML = `${data.tooltip} audio`;
  });
}

function handleVideo() {
  webexSDKAdapter.meetingsAdapter.meetingControls['mute-video'].display(MEETING_ID).subscribe((data) => {
    const muteVideo = document.getElementById('mute-video');

    muteVideo.innerHTML = data.tooltip;
  });
}

function handleShare() {
  webexSDKAdapter.meetingsAdapter.meetingControls['share-screen']
    .display(MEETING_ID)
    .subscribe((data) => {
    const startShare = document.getElementById('share-screen');

    startShare.innerHTML = data.tooltip;
  });
}

function handleMembers() {
  webexSDKAdapter.membershipSDKAdapter.getMembership(MEETING_ID, 'meeting').subscribe((membership) => {
    if (membership && membership.members) {
      Object.keys(membership.members).forEach((key) => {
        const member = membership.members[key];
        
        if (!document.getElementById(member.personID)) {
          let tbody = document.getElementsByTagName('tbody')[0];
          let tr = document.createElement('tr');
          tr.setAttribute('id', member.personID);
          for (let i = 0; i < 8; i++) {
            let td = document.createElement('td');
            tr.appendChild(td);
          }
          tbody.appendChild(tr);
        }
        
        let dataCells = document.getElementById(member.personID).getElementsByTagName('td');
        dataCells[0].innerHTML = member.email;
        dataCells[1].innerHTML = member.name;
        dataCells[2].innerHTML = !!member.isAudioMuted;
        dataCells[3].innerHTML = !!member.isVideoMuted;
        dataCells[4].innerHTML = !!member.isSelf;
        dataCells[5].innerHTML = !!member.isHost;
        dataCells[6].innerHTML = !!member.isInMeeting;
        dataCells[7].innerHTML = !!member.isContentSharing;
      });
    }
  });
}

function getMeeting() {
  webexSDKAdapter.meetingsAdapter.getMeeting(MEETING_ID).subscribe(
    (meeting) => {
      // eslint-disable-next-line no-console
      console.log('Received meeting update: ', meeting);

      document.getElementById('remote-audio').srcObject = meeting.remoteAudio;
      document.getElementById('remote-video').srcObject = meeting.remoteVideo;
      document.getElementById('local-audio').srcObject = meeting.localAudio;
      document.getElementById('local-video').srcObject = meeting.localVideo;
      document.getElementById('local-share').srcObject = meeting.localShare;
      document.getElementById('remote-share').srcObject = meeting.remoteShare;
      document.getElementById('meeting-title').innerHTML = meeting.title;
    },
    () => {},
    // eslint-disable-next-line no-console
    () => console.log(`Meeting "${MEETING_ID}" has ended.`)
  );
}

document.getElementById('connector').addEventListener('click', async (event) => {
  event.preventDefault();
  const status = document.getElementById('connection-status');

  try {
    if (event.target.id === 'connect') {
      await webexSDKAdapter.connect();
      status.innerHTML = 'Connected ✅';
    } else {
      await webexSDKAdapter.disconnect();
      status.innerHTML = 'Disconnected ❌';
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to connect/disconnect:', error);
  }
});

document.getElementById('dialer').addEventListener('click', async (event) => {
  event.preventDefault();

  const destination = document.getElementById('destination').value;

  try {
    switch (event.target.id) {
      case 'create-meeting':
        webexSDKAdapter.meetingsAdapter.createMeeting(destination).subscribe(({ID}) => {
          MEETING_ID = ID;
          getMeeting();
          handleAudio();
          handleVideo();
          handleShare();
          handleMembers();
        });
        break;
      case 'join-meeting':
        await webexSDKAdapter.meetingsAdapter.meetingControls['join-meeting'].action(MEETING_ID);
        break;
      case 'leave-meeting':
        await webexSDKAdapter.meetingsAdapter.meetingControls['leave-meeting'].action(MEETING_ID);
        break;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to perform any dialing actions:', error);
  }
});

document.getElementById('actions').addEventListener('click', async (event) => {
  event.preventDefault();

  try {
    switch (event.target.id) {
      case 'mute-audio':
        await webexSDKAdapter.meetingsAdapter.meetingControls['mute-audio'].action(MEETING_ID);
        break;
      case 'mute-video':
        await webexSDKAdapter.meetingsAdapter.meetingControls['mute-video'].action(MEETING_ID);
        break;
      case 'share-screen':
        await webexSDKAdapter.meetingsAdapter.meetingControls['share-screen'].action(MEETING_ID);
        break;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to perform an action:', error);
  }
});
