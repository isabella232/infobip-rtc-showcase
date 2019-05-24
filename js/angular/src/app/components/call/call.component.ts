import {Component, OnInit, ViewChild} from '@angular/core';
import {Call, InfobipRTC} from "infobip-rtc";
import {HttpClient} from "@angular/common/http";
import {IncomingCall} from "infobip-rtc/dist/call/IncomingCall";

@Component({
  selector: 'app-call',
  templateUrl: './call.component.html'
})
export class CallComponent implements OnInit {
  @ViewChild("remoteAudio") remoteAudio: HTMLAudioElement;

  destination: string = '';
  infobipRTC: InfobipRTC = null;
  activeCall: Call = null;
  identity: string = '';
  status: string = '';
  isCallEstablished: boolean = false;
  isOutgoingCall: boolean = false;
  isIncomingCall: boolean = false;

  constructor(private httpClient: HttpClient) {
    this.connectInfobipRTC();
  }

  ngOnInit(): void {
  }

  connectInfobipRTC = async () => {
    this.httpClient.post('http://localhost:8080/token', {})
      .toPromise()
      .then((response: Response) => {
        let that = this;
        // @ts-ignore
        this.infobipRTC = new InfobipRTC(response.token, {debug: true});
        this.infobipRTC.on('connected', function (event) {
          that.identity = event.identity;
          console.log('Connected to Infobip RTC Cloud with: %s', event.identity);
        });
        this.infobipRTC.on('disconnected', function (event) {
          console.warn('Disconnected from Infobip RTC Cloud.');
        });
        this.infobipRTC.connect();
        this.listenForIncomingCall();
      });
  };

  listenForIncomingCall = () => {
    let that = this;
    this.infobipRTC.on('incoming-call', function (incomingCall) {
      console.log('Received incoming call from: ' + incomingCall.caller.identity);

      that.activeCall = incomingCall;
      that.isIncomingCall = true;
      that.status = 'Incoming call from: ' + incomingCall.caller.identity;

      incomingCall.on('established', () => {
        // @ts-ignore
        that.remoteAudio.nativeElement.srcObject = incomingCall.remoteStream;
        that.status = 'In a call with: ' + incomingCall.caller.identity;
        that.isCallEstablished = true;
      });
      incomingCall.on('hangup', () => {
        that.setValuesAfterIncomingCall();
      });
      incomingCall.on('error', function (event) {
        console.log('Oops, something went very wrong! Message: ' + JSON.stringify(event));
        that.setValuesAfterIncomingCall();
      });
    });
  };

  listenForCallEvents = () => {
    if (this.activeCall) {
      let that = this;
      this.activeCall.on('established', function (event) {
        that.status = 'Call established with: ' + that.destination;
        console.log('Call established with ' + that.destination);
        // @ts-ignore
        that.remoteAudio.nativeElement.srcObject = event.remoteStream;
      });
      this.activeCall.on('hangup', function (event) {
        that.setValuesAfterOutgoingCall();
      });
      this.activeCall.on('ringing', function () {
        that.status = 'Ringing...';
        console.log('Call is ringing...');
      });
      this.activeCall.on('error', function (event) {
        console.log('Oops, something went very wrong! Message: ' + JSON.stringify(event));
        that.setValuesAfterOutgoingCall();
      });
    }
  };

  onChange = (event) => {
    this.destination = event.target.value;
  };

  call = () => {
    if (this.destination) {
      this.activeCall = this.infobipRTC.call(this.destination, {});
      this.isOutgoingCall = true;

      this.listenForCallEvents();
    }
  };

  callPhoneNumber = () => {
    if (this.destination) {
      this.activeCall = this.infobipRTC.callPhoneNumber(this.destination, {from: '33755531044'});
      this.listenForCallEvents();
    }
  };

  hangup = () => {
    this.activeCall.hangup();
  };

  accept = () => {
    (<IncomingCall>this.activeCall).accept();
  };

  decline = () => {
    (<IncomingCall>this.activeCall).decline();
  };

  shouldDisableButtonsOnIncomingCall = () => {
    return this.isCallEstablished || this.isOutgoingCall || !this.isIncomingCall;
  };

  shouldDisableHangupButton = () => {
    return !this.activeCall || (!this.isCallEstablished && this.isIncomingCall);
  };

  private setValuesAfterIncomingCall() {
    this.status = null;
    this.activeCall = null;
    this.isCallEstablished = false;
    this.isIncomingCall = false;
  }

  private setValuesAfterOutgoingCall() {
    this.status = null;
    this.activeCall = null;
    this.isOutgoingCall = false;
  }
}
