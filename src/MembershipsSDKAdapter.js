import {concat, fromEvent, Observable} from 'rxjs';
import {map, publishReplay, refCount} from 'rxjs/operators';
import {MembershipsAdapter} from '@webex/component-adapter-interfaces';
// import {MembershipsAdapter, DestinationType} from '../../component-adapter-interfaces/src/MembershipsAdapter.js';

// JS SDK Events
const EVENT_MEMBERS_UPDATE = 'members:update';

/**
 * The `MembershipsSDKAdapter` is an implementation of the `MembershipsAdapter` interface.
 * This adapter utilizes the Webex JS SDK to fetch membership state updates.
 *
 * @class MembershipsSDKAdapter
 * @extends {MembershipsAdapter}
 */
export default class MembershipsSDKAdapter extends MembershipsAdapter {
  constructor(datasource) {
    super(datasource);
    this.getMembershipObservables = {};
    this.memberships = {};
  }

  /**
   * Returns a SDK meeting object retrieved from the collection.
   *
   * @param {string} ID ID of the meeting to fetch.
   * @returns {Object} The SDK meeting object from the meetings collection.
   * @memberof MembershipsSDKAdapter
   * @private
   */
  fetchMeeting(ID) {
    return this.datasource.meetings.getMeetingByType('id', ID);
  }

  /**
   * Returns an observable that emits meeting data of the given destinationID.
   *
   * @param {string} destinationID  ID of the destination for which to get members.
   * @param {DestinationType} destinationType  type of the membership destination.
   * @returns {Observable.<Membership>}
   * @memberof MembershipsSDKAdapter
   */
  getMembersFromDestination(destinationID, destinationType) {
    if (!(destinationID in this.getMembershipObservables)) {
      // console.log("first membership!");

      const sdkMeeting = this.fetchMeeting(destinationID);
      const getMembership$ = Observable.create((observer) => {
        if (this.memberships[destinationID]) {
          observer.next(this.memberships[destinationID]);
        } else {
          observer.next({});
        }

        observer.complete();
      });

      if (!this.memberships[destinationID]) {
        this.memberships[destinationID] = {
          destinationID,
          destinationType,
          members: {},
        };
      }

      const membershipUpdateEvent$ = fromEvent(sdkMeeting.members, EVENT_MEMBERS_UPDATE).pipe(
        map(({full}) => {
          // TODO: add duplicate fix
          // TODO: add inmeeting/notinmeeting
          const inMeetingMembers = [];
          const notInMeetingMembers = [];

          Object.keys(full).forEach((key) => {
            const member = {
              personID: full[key].id,
              email: full[key].email,
              name: full[key].name,
              isAudioMuted: !!full[key].isAudioMuted,
              isVideoMuted: !!full[key].isVideoMuted,
              isSelf: !!full[key].isSelf,
              isHost: !!full[key].isHost,
              isSharing: !!full[key].isContentSharing,
            };
            const memberArray = full[key].isInMeeting ? inMeetingMembers : notInMeetingMembers;

            memberArray.push(member);
          });

          // console.log('1111', inMeetingMembers, notInMeetingMembers);
          this.memberships[destinationID].members = {inMeetingMembers, notInMeetingMembers};

          return this.memberships[destinationID];
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
