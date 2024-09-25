import {
  Collection,
  Entity,
  Enum,
  ManyToOne,
  MikroORM,
  OneToMany,
  PrimaryKey,
  Property,
} from "@mikro-orm/sqlite";
import { v4 as uuid } from "uuid";

export enum VenueType {
  Physical = "Physical",
  Virtual = "Virtual",
}

@Entity({ tableName: "appointment-sti" })
export class AppointmentStiEntity {
  @PrimaryKey({ unique: true })
  id: string = uuid();

  @OneToMany(() => VenueStiEntity, (venue) => venue.appointment)
  venues = new Collection<VenueStiEntity>(this);
}

@Entity({
  tableName: "venue-sti",
  discriminatorColumn: "type",
  discriminatorValue: "Venue",
})
export abstract class VenueStiEntity {
  @PrimaryKey({ unique: true })
  id: string = uuid();

  @Property()
  name!: string;

  @Enum(() => VenueType)
  type!: VenueType; // discriminator for polymorphic behavior

  @ManyToOne(() => AppointmentStiEntity)
  appointment!: AppointmentStiEntity;
}

@Entity({ discriminatorValue: VenueType.Physical })
export class PhysicalVenueStiEntity extends VenueStiEntity {
  @Property()
  street!: string;

  @Property()
  block!: string;
}

@Entity({ discriminatorValue: VenueType.Virtual })
export class VirtualVenueStiEntity extends VenueStiEntity {
  @Property()
  meetingLink!: string;

  @Property()
  passcode!: string;
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [
      AppointmentStiEntity,
      VenueStiEntity,
      PhysicalVenueStiEntity,
      VirtualVenueStiEntity,
    ],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test("basic CRUD example", async () => {
  const appointment = new AppointmentStiEntity();

  const physicalVenue = new PhysicalVenueStiEntity();
  physicalVenue.name = "Venue 1";
  physicalVenue.street = "Street 1";
  physicalVenue.block = "Block 1";
  physicalVenue.appointment = appointment;

  const virtualVenue = new VirtualVenueStiEntity();
  virtualVenue.name = "Venue 2";
  virtualVenue.meetingLink = "Link 1";
  virtualVenue.passcode = "Passcode 1";
  virtualVenue.appointment = appointment;

  const repository = orm.em.getRepository(VenueStiEntity);
  const em = repository.getEntityManager();

  await em.persistAndFlush([virtualVenue, physicalVenue]);

  const venues = await repository.findAll();
  console.log({ venues });

  // make updates on the managed venue entities
  for (const venue of venues) {
    if (venue instanceof PhysicalVenueStiEntity) {
      venue.block = `Block ${Math.random()}`;
    }

    if (venue instanceof VirtualVenueStiEntity) {
      venue.passcode = `Passcode ${Math.random()}`;
    }
  }

  await em.flush();
});
