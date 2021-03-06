
import { EVENTS } from '../../../../common/constants/events';
import { IMAGE_SIZES } from '../../../../common/constants/Soundcloud';
import * as SC from '../../../../common/utils/soundcloudUtils';
import WindowsFeature from '../windowsFeature';
import { ChangeTypes, PlayerStatus } from '../../../../common/store/player';
import { getTrackEntity } from '../../../../common/store/entities/selectors';
import { Logger } from '../../../utils/logger';

export default class Win10MediaService extends WindowsFeature {
  private logger: Logger = new Logger('MprisService');

  shouldRun() {
    return super.shouldRun() && !process.env.TOKEN; // TODO remove this and figure out why nodert isn't being added on AppVeyor
  }

  register() {

    try {
      const { MediaPlaybackStatus, MediaPlaybackType, SystemMediaTransportControlsButton } = require('@nodert-win10/windows.media');
      const { BackgroundMediaPlayer } = require('@nodert-win10/windows.media.playback');
      const { RandomAccessStreamReference } = require('@nodert-win10/windows.storage.streams');
      const { Uri } = require('@nodert-win10/windows.foundation');

      const Controls = BackgroundMediaPlayer.current.systemMediaTransportControls;

      Controls.isChannelDownEnabled = false;
      Controls.isChannelUpEnabled = false;
      Controls.isFastForwardEnabled = false;
      Controls.isNextEnabled = true;
      Controls.isPauseEnabled = true;
      Controls.isPlayEnabled = true;
      Controls.isPreviousEnabled = true;
      Controls.isRecordEnabled = false;
      Controls.isRewindEnabled = false;
      Controls.isStopEnabled = true;
      Controls.playbackStatus = MediaPlaybackStatus.closed;
      Controls.displayUpdater.type = MediaPlaybackType.music;

      Controls.displayUpdater.musicProperties.title = 'Auryo';
      Controls.displayUpdater.musicProperties.artist = 'No track is playing';
      Controls.displayUpdater.update();

      Controls.on('buttonpressed', (_sender: any, eventArgs: any) => {
        switch (eventArgs.button) {
          case SystemMediaTransportControlsButton.play:
            this.togglePlay(PlayerStatus.PLAYING);
            break;
          case SystemMediaTransportControlsButton.pause:
            this.togglePlay(PlayerStatus.PAUSED);
            break;
          case SystemMediaTransportControlsButton.stop:
            this.togglePlay(PlayerStatus.STOPPED);
            break;
          case SystemMediaTransportControlsButton.next:
            this.changeTrack(ChangeTypes.NEXT);
            break;
          case SystemMediaTransportControlsButton.previous:
            this.changeTrack(ChangeTypes.PREV);
            break;
          default:
            break;
        }
      });

      this.on(EVENTS.APP.READY, () => {
        this.on(EVENTS.PLAYER.STATUS_CHANGED, () => {
          const {
            player: { status }
          } = this.store.getState();

          const mapping = {
            [PlayerStatus.STOPPED]: MediaPlaybackStatus.stopped,
            [PlayerStatus.PAUSED]: MediaPlaybackStatus.paused,
            [PlayerStatus.PLAYING]: MediaPlaybackStatus.playing
          };

          Controls.playbackStatus = mapping[status];
        });

        this.on(EVENTS.PLAYER.TRACK_CHANGED, () => {
          const {
            player: { playingTrack }
          } = this.store.getState();

          if (playingTrack) {
            const trackId = playingTrack.id;
            const track = getTrackEntity(trackId)(this.store.getState());

            if (track) {
              const image = SC.getImageUrl(track, IMAGE_SIZES.SMALL);
              Controls.displayUpdater.musicProperties.title = track.title || '';
              Controls.displayUpdater.musicProperties.artist = track.user && track.user.username ? track.user.username : 'Unknown artist';
              Controls.displayUpdater.musicProperties.albumTitle = track.genre || '';
              Controls.displayUpdater.thumbnail = image ? RandomAccessStreamReference.createFromUri(new Uri(image)) : '';

              Controls.displayUpdater.update();

              return;
            }

          }

          Controls.displayUpdater.musicProperties.title = 'Auryo';
          Controls.displayUpdater.musicProperties.artist = 'No track is playing';

          Controls.displayUpdater.update();
        });
      });
    } catch (e) {
      this.logger.error(e);
    }
  }

  togglePlay = (new_status: PlayerStatus) => {
    const {
      player: { status }
    } = this.store.getState();

    if (status !== new_status) {
      this.sendToWebContents(EVENTS.PLAYER.TOGGLE_STATUS, new_status);
    }
  }

  changeTrack = (change_type: ChangeTypes) => {
    this.sendToWebContents(EVENTS.PLAYER.CHANGE_TRACK, change_type);
  }
}
