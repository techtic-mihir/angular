import { Injectable } from '@angular/core';

@Injectable()
export class FlashMessagesService {
    show: (text?: string, options?: Object) => void;
    grayOut: (value: boolean) => void;
}
