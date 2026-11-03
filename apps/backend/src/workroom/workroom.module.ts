import { Module } from '@nestjs/common';
import { WorkroomController } from './workroom.controller.js';
import { WorkroomService } from './workroom.service.js';

@Module({
  controllers: [WorkroomController],
  providers: [WorkroomService],
})
export class WorkroomModule {}
