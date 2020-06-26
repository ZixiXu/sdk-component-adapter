import {concat, fromEvent, Observable} from 'rxjs';
import {map, publishReplay, refCount} from 'rxjs/operators';

import MembershipAdapter from './MembershipAdapter';

// JS SDK Events
const EVENT_MEMBERS_UPDATE = 'members:update';

/**
 * The `MembershipSDKAdapter` is an implementation of the `MembershipAdapter` interface.
 * This adapter utilizes the Webex JS SDK to create and join webex meetings.
 *
 * @class MembershipSDKAdapter
 * @extends {MembershipAdapter}
 */
export default class MembershipSDKAdapter extends MembershipAdapter {
  constructor(datasource) {
    super(datasource);
    this.getMembershipObservables = {};
    this.membership = {};
  }

  /**
   * Register the SDK meeting plugin to the device
   * and sync the meeting collection from the server.
   */
  async connect() {
    await this.datasource.meetings.register();
    await this.datasource.meetings.syncMeetings();
  }

  /**
   * Unregister the SDK meeting plugin from the device.
   */
  async disconnect() {
    await this.datasource.meetings.unregister();
  }

  /**
   * Returns a SDK meeting object retrieved from the collection.
   *
   * @param {string} ID ID of the meeting to fetch.
   * @returns {Object} The SDK meeting object from the meetings collection.
   * @memberof MeetingsSDKAdapter
   * @private
   */
  fetchMeeting(ID) {
    return this.datasource.meetings.getMeetingByType('id', ID);
  }

  /**
   * Returns an observable that emits meeting data of the given destinationID.
   *
   * @param {string} destinationID  ID of the meeting to get.
   * @param {string} destinationType  type of the meeting to get.
   * @returns {Observable.<Membership>}
   * @memberof MembershipSDKAdapter
   */
  getMembership(destinationID, destinationType) {
    if (!(destinationID in this.getMembershipObservables)) {
      // console.log("first membership!");

      const sdkMeeting = this.fetchMeeting(destinationID);
      const getMembership$ = Observable.create((observer) => {
        if (this.membership[destinationID]) {
          observer.next(this.membership[destinationID]);
        } else {
          observer.next({});
        }

        observer.complete();
      });

      const membershipUpdateEvent$ = fromEvent(sdkMeeting.members, EVENT_MEMBERS_UPDATE).pipe(
        map(({full}) => {
          // console.log("membership!");
          if (!this.membership[destinationID]) {
            this.membership[destinationID] = {
              destinationID,
              destinationType,
              members: [],
            };
          }

          Object.keys(full).forEach((key) => {
            this.membership[destinationID].members.push({
              personID: full[key].id,
              email: full[key].email,
              name: full[key].name,
              isAudioMuted: !!full[key].isAudioMuted,
              isVideoMuted: !!full[key].isVideoMuted,
              isSelf: !!full[key].isSelf,
              isHost: !!full[key].isHost,
              isInMeeting: !!full[key].isInMeeting,
              isSharing: !!full[key].isContentSharing,
            });
          });

          return this.membership[destinationID];
        })
      );

      const getMembershipWithEvents$ = concat(getMembership$, membershipUpdateEvent$);

      // Convert to a multicast observable
      this.getMembershipObservables[destinationID] = getMembershipWithEvents$.pipe(
        publishReplay(1),
        refCount()
        // takeUntil(end$)
      );
    }

    return this.getMembershipObservables[destinationID];
  }
}
