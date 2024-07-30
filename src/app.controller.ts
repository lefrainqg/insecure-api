import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as fs from 'fs';

class LoginFormDto {
   username: string;
   password: string;
}

type User = {
   username: string;
   password: string;
   balance: number;
}

type Session = {
   sessionId: string;
   username: string;
}

type TransferFormDto = {
   amount: number;
   username: string;
}

class AppManager {

   static users: User[] = [
      { username: 'alex', password: '0000', balance: 300 },
      { username: 'katy', password: '1111', balance: 300 }
   ];

   static sessions: Session[] = [];

   static loadSessions() {
      try {
         const data = fs.readFileSync('/sessions.json', 'utf-8');
         this.sessions = JSON.parse(data);
      } catch (error) {
         console.log('Error reading sessions file', error);
      }
   }


   static createUserSesion = (username: string) => {

      const sessionId: string = `${new Date().getTime()}${Math.random()}`;
      const newSession: Session = { sessionId, username };

      AppManager.sessions.push(newSession);

      fs.writeFileSync('/sessions.json', JSON.stringify(AppManager.sessions));

      return sessionId;
   }

   static getUserSessionId = (sessionId: string | null) => {
      console.log('getUserSessionId');
      if (!sessionId) return null;
      const session = AppManager.sessions.find(session => session.sessionId === sessionId);
      if (!session) return null
      const user = AppManager.users.find(user => user.username === session.username);
      return user ? user : null;
   }

   static removeSession = (sessionId: string | null) => {
      console.log('getUserSessionId');
      if (!sessionId) return null;
      const session = AppManager.sessions.filter(session => session.sessionId !== sessionId);
      return session ? session : null;
   }

   static getUser = (username: string) => {
      return AppManager.users.find(user => user.username === username) || null;
   }

}

const loginPage = `
   <h1>Login</h1>
   <br>
   <form action="/login" method="POST">
      <input type="text" name="username" placeholder="Username" />
      <input type="password" name="password" placeholder="Password" />
      <button>Login</button>
   </form>
`

const homePage = `
   <h1>Home</h1>
   <br>
   <h2>Users</h2>

  <div>
      <h3>Username: {{username}}</h3>
      <p>Balance: {{balance}}</p>
      <button>Transfer</button>
   </div>

   <br>
   <br>
   
   <form action="/transfer" method="POST">
      <input type="number" name="amount" placeholder="0" />
      <input type="text" name="username" placeholder="Username" />
      <button>Transfer ammount</button>
   </form>
      
   <br>
   <br>

   <h2>Logout</h2>

    <form action="/logout" method="POST">
      <button>Logout</button>
   </form>

`;

@Controller()
export class AppController {

   constructor() { }

   static sessions: Session[] = [];

   @Get()
   home(@Req() req: Request): string {
      console.log("At Home");
      const user = AppManager.getUserSessionId(req.cookies.sessionId);
      if (user) {
         return homePage.replace('{{username}}', user.username).replace('{{balance}}', user.balance.toFixed(2));
      }
      return loginPage;
   }

   @Post('/login')
   login(@Body() req: LoginFormDto, @Res() res: Response) {

      const { username, password } = req;
      const user = AppManager.users.find(user => user.username === username && user.password === password);
      if (!user) {
         throw new UnauthorizedException('Invalid credentials');
      }

      const sessionId = AppManager.createUserSesion(user.username);

      res.cookie('sessionId', sessionId, { httpOnly: true });

      res.redirect('/');

   }

   @Post('/logout')
   logout(@Req() req: Request, @Res() res: Response) {

      const sessionId = req.headers.cookie.split('=')[1].split(';')[0];
      console.log(sessionId);

      AppManager.sessions = AppManager.removeSession(sessionId);

      res.redirect('/');

      res.cookie('sessionId', '', { expires: new Date(1970) });

   }

   @Post('transfer')
   tranfer(
      @Body() tranferFormDto: TransferFormDto,
      @Req() req: Request,
      @Res() res: Response,
   ) {
      const ammountToTransfer = +tranferFormDto.amount;

      if (isNaN(ammountToTransfer) || ammountToTransfer <= 0)
         throw new UnauthorizedException('Invalid ammount');

      const fromUser = AppManager.getUserSessionId(req.cookies.sessionId);
      const toUser = AppManager.getUser(tranferFormDto.username);

      if (!fromUser || !toUser) throw new UnauthorizedException('User not found');

      if (fromUser.balance < ammountToTransfer) {
         throw new UnauthorizedException('User not found');
      }

      fromUser.balance -= ammountToTransfer;
      toUser.balance += ammountToTransfer;
      res.redirect('/');
   }


}
